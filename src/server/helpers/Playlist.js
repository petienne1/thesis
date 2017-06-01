const knex = require('../db/db');
const request = require('request-promise-native');
const _ = require('underscore');

const abbreviation = require('../data/abbreviation');

const Playlist = {};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Helpers
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Parse request query string
const parseGetPlaylistReq = (req, min, max) => {
  const props = {
    country: req.query.country ? req.query.country.split(',') : null,
    trend: req.query.trend ? req.query.trend.split(',') : null,
    random: req.query.random || null,
    limit: parseInt(req.query.limit, 10) || 100,
  };
  if (props.random === 'true') props.random = true;
  if (props.limit < min) props.limit = min;
  if (props.limit > max) props.limit = max;
  return props;
};

const filterPlaylistsWorldMix = (playlists) => {
  // the Needle
  const curatedPlaylists = playlists.filter(playlist => playlist.playlist_name.includes('The Needle') && !playlist.playlist_name.includes('/'));
  // log the names
  curatedPlaylists.forEach(playlist => console.log(playlist.playlist_name));
  return curatedPlaylists;
};

const filterPlaylistsByCountries = (playlists, countries) => {
  if (countries === null || countries[0] === 'World') return filterPlaylistsWorldMix(playlists);
  let curatedPlaylists = [];
  countries.forEach((country) => {
    const abb = abbreviation[country];
    // console.log(abb);
    const matchingPlaylists = playlists.filter((playlist) => {
      // india bug fix!
      if (country === 'India' && playlist.playlist_name.includes('Indiana')) return false;
      return playlist.playlist_name.includes(country) || playlist.playlist_name.includes(abb);
    });
    curatedPlaylists = curatedPlaylists.concat(matchingPlaylists);
  });

  // if country not available
  if (curatedPlaylists.length === 0) {
    curatedPlaylists = filterPlaylistsWorldMix(playlists);
  }

  // log the names
  curatedPlaylists.forEach(playlist => console.log(playlist.playlist_name));
  return curatedPlaylists;
};

const filterPlaylistsByTrends = (playlists, trends) => {
  if (trends === null) return playlists;
  let curatedPlaylists = [];
  trends.forEach((trend) => {
    const matchingPlaylists = playlists.filter(playlist => playlist.playlist_name.includes(trend));
    curatedPlaylists = curatedPlaylists.concat(matchingPlaylists);
  });
  // if trend not available
  if (curatedPlaylists.length === 0) {
    curatedPlaylists = playlists;
  }
  return curatedPlaylists;
};

// const randomizeTracks = (tracks, shouldRandomize) => {
//   if (shouldRandomize === false) return tracks;
//   return _.shuffle(tracks);
// };

const makeSureWeCanPlayTheTracks = (tracks) => {
  const original = tracks.length;
  // console.log('<82> ORIGINAL -> ', tracks.length);
  const curatedTracks = _.filter(tracks, (track) => {
    const hasPreviewURL = track.track_preview_url !== null;
    let isAvailableInTheUS;
    if (track.track_available_markets[track.track_available_markets.length - 1] === ']') {
      isAvailableInTheUS = JSON.parse(track.track_available_markets).includes('US');
    } else {
      isAvailableInTheUS = false;
    }
    return hasPreviewURL && isAvailableInTheUS;
  });
  // console.log('<88> FILTER -> ', curatedTracks.length);
  return curatedTracks;
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// API Endpoint
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Read file 'routes.js' for details on how to use

// GET /playlist/info
Playlist.getPlaylist = (req, res) => {
  const max = 200;
  const min = 0; // not being used currently
  // parse query string
  const props = parseGetPlaylistReq(req, min, max);
  // let randomize = false;
  // if (props.random === true) randomize = true;
  console.log(`Country: ${props.country}, Trend: ${props.trend}, Limit: ${props.limit}, Random: ${props.random}`);

  // get all playlists from the database
  knex('playlists').select('*')
    .then((playlists) => {
      console.log(`Retrieved ${playlists.length} playlists from database!`);
      // filter playlists
      let curatedPlaylists = playlists;
      curatedPlaylists = filterPlaylistsByCountries(curatedPlaylists, props.country);
      curatedPlaylists = filterPlaylistsByTrends(curatedPlaylists, props.trend);

      // if (curatedPlaylists.length > 1) randomize = true;
      // create an array of tracks ids with no duplicates
      let curatedTracks = curatedPlaylists.reduce((acc, playlist) =>
         acc.concat(JSON.parse(playlist.playlist_tracks)), []);
      curatedTracks = Array.from(new Set(curatedTracks));
      // curatedTracks = makeSureWeCanPlayTheTracks(curatedTracks);
      // TODO! check lower limit
      // console.log(curatedTracks.length, _.uniq(curatedTracks).length)

      console.log(`Sending a list of ${curatedTracks.length} curated tracks!`);

      // get all tracks from the database included in the tracks array
      knex('tracks')
        .groupBy('track_id') // removes duplicate id's (not necessary in theory, yet it is)
        .whereIn('track_id', curatedTracks)
        .then((data) => {
          data = makeSureWeCanPlayTheTracks(data);
          data = _.shuffle(data);
          if (data.length + 1 > props.limit) data = data.slice(0, props.limit);
          res.status(200).send(data);
        })
        .catch((err) => {
          console.log(err);
          res.status(404).send('Something went wrong!', err);
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(404).send('Something went wrong!', err);
    });
};

// GET /playlist/info
Playlist.getPlaylistInfo = (req, res) => {
  const id = req.query.id;
  if (!id) {
    // return all playlists
    knex('playlists').select('*')
      .then(playlists => res.status(200).send(playlists))
      .catch(err => console.log(err));
  } else {
    // return one playlist
    knex('playlists').where('playlist_id', id)
      .then(playlist => res.status(200).send(playlist))
      .catch(err => console.log(err));
  }
};

// GET /playlist/length
Playlist.getPlaylistLength = (req, res) => {
  knex('playlists').select('*')
    .then(playlist => res.status(200).send([playlist.length]))
    .catch(err => console.log(err));
};

Playlist.getPlaylistNames = (req, res) => {
  knex('playlists').select('*')
    .then((playlist) => {
      let s = '';
      _.each(playlist, (p) => {
        s += p.playlist_name;
        s += '\n';
      });
      res.status(200).send(s);
    })
    .catch(err => console.log(err));
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Sync
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Playlist.sync = (req, res) => {
  // AKA PROMISE HELL!
  const DEBUG_MODE = true;
  const TIME_START = Date.now();
  // Case Auth
  if (req.user) {
    if (DEBUG_MODE) console.log(`223 [${Date.now() - TIME_START}ms] -> AUTHENTICATED!`);
    const userId = req.user.id;
    if (DEBUG_MODE) console.log(`225 [${Date.now() - TIME_START}ms] -> USER ID: ${userId}`);
    let tracks = req.body;
    tracks = tracks.map(t => t.track_id);
    // console.log('Sync -> userId: ', userId);
    if (DEBUG_MODE) console.log(`229 [${Date.now() - TIME_START}ms] -> RECEIVED ${tracks.length} TRACKS!`);
    if (DEBUG_MODE) console.log(`230 [${Date.now() - TIME_START}ms] -> LOOKING FOR THE USER'S PLAYLIST ID IN THE DATABASE...`);
    knex('users')
      .where('user_id', userId)
      .then(users => users[0].user_playlist)
      .then((userPlaylist) => {
        if (DEBUG_MODE) console.log(`235 [${Date.now() - TIME_START}ms] -> FOUND PLAYLIST ID ${userPlaylist} FOR USER ${userId}`);
        if (userPlaylist === null) {
          if (DEBUG_MODE) console.log(`237 [${Date.now() - TIME_START}ms] -> PLAYLIST DOESN'T EXISTS, CREATING ONE...`);
          request({
            method: 'POST',
            url: `https://api.spotify.com/v1/users/${userId}/playlists`,
            headers: { Authorization: `Bearer ${req.user.accessToken}` },
            body: JSON.stringify({
              name: 'World FM',
              description: 'Created with love, just for you!',
            }),
          })
            .then(newPlaylistData => JSON.parse(newPlaylistData))
            .then(parsedNewPlaylistData => parsedNewPlaylistData.id)
            .then((newPlaylistId) => {
              if (DEBUG_MODE) console.log(`250 [${Date.now() - TIME_START}ms] -> PLAYLIST CREATED WITH ID ${newPlaylistId}`);
              knex('users')
              .where('user_id', userId)
              .update({ user_playlist: newPlaylistId })
              .catch(err => res.status(254).send(err));
              if (DEBUG_MODE) console.log(`255 [${Date.now() - TIME_START}ms] -> SAVED PLAYLIST ${newPlaylistId} IN DATABASE!`);
              if (DEBUG_MODE) console.log(`256 [${Date.now() - TIME_START}ms] -> SYNCING PLAYLIST...`);
              const tracksToAdd = tracks.map(t => `spotify:track:${t}`);
              if (DEBUG_MODE) console.log(`258 [${Date.now() - TIME_START}ms] -> ADDING ${tracksToAdd.length} TRACKS TO PLAYLIST...`);
              const addP = [];
              for (let i = 0; i < tracksToAdd.length; i += 50) {
                if (DEBUG_MODE) console.log(`311 [${Date.now() - TIME_START}ms] -> CREATING ADD PROMISES, TRACKS ${i} - ${i + 50}`);
                addP.push(
                  request({
                    method: 'POST',
                    url: `https://api.spotify.com/v1/users/${userId}/playlists/${newPlaylistId}/tracks`,
                    headers: { Authorization: `Bearer ${req.user.accessToken}` },
                    body: JSON.stringify({ uris: tracksToAdd.slice(i, i + 50) }),
                  }));
              }
              if (DEBUG_MODE) console.log(`270 [${Date.now() - TIME_START}ms] -> ABOUT TO START PROMISE ALL, ADDING TRACKS...`);
              Promise.all(addP)
              .then((addResponse) => {
                if (DEBUG_MODE) console.log(`273 [${Date.now() - TIME_START}ms] -> PROMISE ALL HAS ENDED! RESPONSE IS: ${addResponse}`);
                res.status(274).send(addResponse);
              })
              .catch(err => res.status(276).send(err));
            })
            .catch(err => res.status(278).send(err));
        } else {
          if (DEBUG_MODE) console.log(`280 [${Date.now() - TIME_START}ms] -> LOOKING FOR PLAYLIST ${userPlaylist} IN SPOTIFY...`);
          request({
            method: 'GET',
            url: `https://api.spotify.com/v1/users/${userId}/playlists?limit=50`,
            headers: { Authorization: `Bearer ${req.user.accessToken}` },
          })
          .then(userPlaylistsData => JSON.parse(userPlaylistsData))
          .then(parsedUserPlaylistsData => parsedUserPlaylistsData.items.map(i => i.id))
          .then(mappedUserPlaylistsData => _.contains(mappedUserPlaylistsData, userPlaylist))
          .then((playlistIsInSpotify) => {
            if (playlistIsInSpotify) {
              if (DEBUG_MODE) console.log(`291 [${Date.now() - TIME_START}ms] -> PLAYLIST WITH ID ${userPlaylist} FOUND IN SPOTIFY! `);
              if (DEBUG_MODE) console.log(`292 [${Date.now() - TIME_START}ms] -> SYNCING PLAYLIST...`);
              request({
                method: 'GET',
                url: `https://api.spotify.com/v1/users/${userId}/playlists/${userPlaylist}?fields=tracks(total)`,
                headers: { Authorization: `Bearer ${req.user.accessToken}` },
              })
              .then(playlistData => JSON.parse(playlistData))
              .then(parsedPlaylistData => parsedPlaylistData.tracks.total)
              .then((totalTracks) => {
                if (DEBUG_MODE) console.log(`301 [${Date.now() - TIME_START}ms] -> PLAYLIST WITH ID ${userPlaylist} HAS ${totalTracks} TOTAL TRACKS!`);
                if (DEBUG_MODE) console.log(`302 [${Date.now() - TIME_START}ms] -> CREATING ARRAY OF TRACK IDS...`);
                const p = [];
                for (let i = 0; i < totalTracks; i += 100) {
                  if (DEBUG_MODE) console.log(`305 [${Date.now() - TIME_START}ms] -> LOOKING THROUGH TRACKS ${i} - ${i + 100}`);
                  p.push(
                    request({
                      method: 'GET',
                      url: `https://api.spotify.com/v1/users/${userId}/playlists/${userPlaylist}/tracks?offset=${i}&limit=100`,
                      headers: { Authorization: `Bearer ${req.user.accessToken}` },
                    }));
                }
                if (DEBUG_MODE) console.log(`313 [${Date.now() - TIME_START}ms] -> STARTING PROMISE CALL TO GET ${userPlaylist} TRACK IDS`);
                Promise.all(p)
                .then(data => data.map(d => JSON.parse(d)))
                .then(parsedData => parsedData.map(d => d.items))
                .then(itemsData => itemsData.map(i => i.map(d => d.track.id)))
                .then(tracksIds => _.flatten(tracksIds))
                .then((tracksIds) => {
                  if (DEBUG_MODE) console.log(`320 [${Date.now() - TIME_START}ms] -> TRACK IDS RETRIEVED! COMPARING WITH TRACKS PROVIDED...`);
                  let tracksToAdd = _.difference(tracks, tracksIds);
                  tracksToAdd = tracksToAdd.map(t => `spotify:track:${t}`);
                  if (DEBUG_MODE) console.log(`323 [${Date.now() - TIME_START}ms] -> FOUND ${tracksToAdd.length} TRACKS TO ADD!`);
                  let tracksToRemove = _.difference(tracksIds, tracks);
                  tracksToRemove = tracksToRemove.map(t => `spotify:track:${t}`);
                  if (DEBUG_MODE) console.log(`326 [${Date.now() - TIME_START}ms] -> FOUND ${tracksToRemove.length} TRACKS TO REMOVE!`);
                  if (DEBUG_MODE) console.log(`327 [${Date.now() - TIME_START}ms] -> PLAYLIST SHOULD HAVE ${tracksIds.length + tracksToAdd.length - tracksToRemove.length} TRACKS!`);
                  if (DEBUG_MODE) console.log(`328 [${Date.now() - TIME_START}ms] -> REMOVING TRACKS FROM PLAYLIST...`);
                  const removeP = [];
                  for (let i = 0; i < tracksToRemove.length; i += 50) {
                    if (DEBUG_MODE) console.log(`331 [${Date.now() - TIME_START}ms] -> CREATING REMOVE PROMISES, TRACKS ${i} - ${i + 50}`);
                    let tracksToRemoveThisIteration = tracksToRemove.slice(i, i + 50);
                    tracksToRemoveThisIteration = tracksToRemoveThisIteration.map((t) => {
                      return { uri: t };
                    });
                    removeP.push(
                      request({
                        method: 'DELETE',
                        url: `https://api.spotify.com/v1/users/${userId}/playlists/${userPlaylist}/tracks`,
                        headers: { Authorization: `Bearer ${req.user.accessToken}` },
                        body: JSON.stringify({ tracks: tracksToRemoveThisIteration }),
                      }));
                  }
                  if (DEBUG_MODE) console.log(`344 [${Date.now() - TIME_START}ms] -> ABOUT TO START PROMISE ALL, REMOVING TRACKS...`);
                  Promise.all(removeP)
                  .then((removeResponse) => {
                    if (DEBUG_MODE) console.log(`347 [${Date.now() - TIME_START}ms] -> PROMISE ALL HAS ENDED! RESPONSE IS: ${removeResponse}`);
                    if (DEBUG_MODE) console.log(`348 [${Date.now() - TIME_START}ms] -> ADDING TRACKS FROM PLAYLIST...`);
                    const addP = [];
                    for (let i = 0; i < tracksToAdd.length; i += 50) {
                      if (DEBUG_MODE) console.log(`351 [${Date.now() - TIME_START}ms] -> CREATING ADD PROMISES, TRACKS ${i} - ${i + 50}`);
                      addP.push(
                        request({
                          method: 'POST',
                          url: `https://api.spotify.com/v1/users/${userId}/playlists/${userPlaylist}/tracks`,
                          headers: { Authorization: `Bearer ${req.user.accessToken}` },
                          body: JSON.stringify({ uris: tracksToAdd.slice(i, i + 50) }),
                        }));
                    }
                    if (DEBUG_MODE) console.log(`360 [${Date.now() - TIME_START}ms] -> ABOUT TO START PROMISE ALL, ADDING TRACKS...`);
                    Promise.all(addP)
                    .then((addResponse) => {
                      if (DEBUG_MODE) console.log(`363 [${Date.now() - TIME_START}ms] -> PROMISE ALL HAS ENDED! RESPONSE IS: ${addResponse}`);
                      res.status(364).send(addResponse);
                    })
                    .catch(err => res.status(366).send(err));
                  })
                  .catch(err => res.status(368).send(err));
                })
                .catch(err => res.status(370).send(err));
              })
              .catch(err => res.status(372).send(err));
            } else {
              if (DEBUG_MODE) console.log(`374 [${Date.now() - TIME_START}ms] -> PLAYLIST NOT FOUND IN SPOTIFY! CREATING ONE...`);
              request({
                method: 'POST',
                url: `https://api.spotify.com/v1/users/${userId}/playlists`,
                headers: { Authorization: `Bearer ${req.user.accessToken}` },
                body: JSON.stringify({
                  name: 'World FM',
                  description: 'Created with love, just for you!',
                }),
              })
              .then(newPlaylistData => JSON.parse(newPlaylistData))
              .then(parsedNewPlaylistData => parsedNewPlaylistData.id)
              .then((newPlaylistId) => {
                if (DEBUG_MODE) console.log(`368 [${Date.now() - TIME_START}ms] -> PLAYLIST CREATED WITH ID ${newPlaylistId}`);
                knex('users')
                .where('user_id', userId)
                .update({ user_playlist: newPlaylistId })
                .catch(err => res.status(391).send(err));
                if (DEBUG_MODE) console.log(`392 [${Date.now() - TIME_START}ms] -> SAVED PLAYLIST ${newPlaylistId} IN DATABASE!`);
                if (DEBUG_MODE) console.log(`393 [${Date.now() - TIME_START}ms] -> SYNCING PLAYLIST...`);
                const tracksToAdd = tracks.map(t => `spotify:track:${t}`);
                if (DEBUG_MODE) console.log(`395 [${Date.now() - TIME_START}ms] -> ADDING ${tracksToAdd.length} TRACKS TO PLAYLIST...`);
                const addP = [];
                for (let i = 0; i < tracksToAdd.length; i += 50) {
                  if (DEBUG_MODE) console.log(`398 [${Date.now() - TIME_START}ms] -> CREATING ADD PROMISES, TRACKS ${i} - ${i + 50}`);
                  addP.push(
                    request({
                      method: 'POST',
                      url: `https://api.spotify.com/v1/users/${userId}/playlists/${newPlaylistId}/tracks`,
                      headers: { Authorization: `Bearer ${req.user.accessToken}` },
                      body: JSON.stringify({ uris: tracksToAdd.slice(i, i + 50) }),
                    }));
                }
                if (DEBUG_MODE) console.log(`407 [${Date.now() - TIME_START}ms] -> ABOUT TO START PROMISE ALL, ADDING TRACKS...`);
                Promise.all(addP)
                .then((addResponse) => {
                  if (DEBUG_MODE) console.log(`410 [${Date.now() - TIME_START}ms] -> PROMISE ALL HAS ENDED! RESPONSE IS: ${addResponse}`);
                  res.status(411).send(addResponse);
                })
                .catch(err => res.status(413).send(err));
              })
              .catch(err => res.status(415).send(err));
            }
          })
          .catch(err => res.status(418).send(err));
        }
      })
      .catch(err => res.status(421).send(err));
  } else {
    // Case No Auth
    res.status(424).send();
  }
};

Playlist.save = (req, res) => {
  // AKA PROMISE HELL!
  const DEBUG_MODE = true;
  const TIME_START = Date.now();
  // Case Auth
  if (req.user) {
    const userId = req.user.id;
    if (DEBUG_MODE) console.log(`435 [${Date.now() - TIME_START}ms] -> AUTHENTICATED!`);
    if (DEBUG_MODE) console.log(`436 [${Date.now() - TIME_START}ms] -> USER ID: ${userId}`);
    const tracks = req.body.tracks.map(t => t.track_id);
    if (DEBUG_MODE) console.log(`438 [${Date.now() - TIME_START}ms] -> RECEIVED ${tracks.length} TRACKS!`);
    if (DEBUG_MODE) console.log(`439 [${Date.now() - TIME_START}ms] -> PLAYLIST DOESN'T EXISTS, CREATING ONE...`);
    request({
      method: 'POST',
      url: `https://api.spotify.com/v1/users/${userId}/playlists`,
      headers: { Authorization: `Bearer ${req.user.accessToken}` },
      body: JSON.stringify({
        name: `World FM | ${req.body.country} | ${Date.now()}`,
        description: 'Be cool, but also be warm!',
      }),
    })
    .then(newPlaylistData => JSON.parse(newPlaylistData))
    .then(parsedNewPlaylistData => parsedNewPlaylistData.id)
    .then((newPlaylistId) => {
      if (DEBUG_MODE) console.log(`452 [${Date.now() - TIME_START}ms] -> PLAYLIST CREATED WITH ID ${newPlaylistId}`);
      if (DEBUG_MODE) console.log(`453 [${Date.now() - TIME_START}ms] -> SYNCING PLAYLIST...`);
      const tracksToAdd = tracks.map(t => `spotify:track:${t}`);
      if (DEBUG_MODE) console.log(`455 [${Date.now() - TIME_START}ms] -> ADDING ${tracksToAdd.length} TRACKS TO PLAYLIST...`);
      const addP = [];
      for (let i = 0; i < tracksToAdd.length; i += 50) {
        if (DEBUG_MODE) console.log(`459 [${Date.now() - TIME_START}ms] -> CREATING ADD PROMISES, TRACKS ${i} - ${i + 50}`);
        addP.push(
          request({
            method: 'POST',
            url: `https://api.spotify.com/v1/users/${userId}/playlists/${newPlaylistId}/tracks`,
            headers: { Authorization: `Bearer ${req.user.accessToken}` },
            body: JSON.stringify({ uris: tracksToAdd.slice(i, i + 50) }),
          }));
      }
      if (DEBUG_MODE) console.log(`467 [${Date.now() - TIME_START}ms] -> ABOUT TO START PROMISE ALL, ADDING TRACKS...`);
      Promise.all(addP)
      .then((addResponse) => {
        if (DEBUG_MODE) console.log(`470 [${Date.now() - TIME_START}ms] -> PROMISE ALL HAS ENDED! RESPONSE IS: ${addResponse}`);
        res.status(471).send(addResponse);
      })
      .catch(err => res.status(473).send(err));
    })
    .catch(err => res.status(475).send(err));
  } else {
    // Case No Auth
    res.status(478).send();
  }
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Database
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Playlist.postPlaylist = (playlist) => {
  knex('playlists').where('playlist_id', playlist.playlist_id)
    .then((data) => {
      if (data.length > 0) {
        console.log('Playlist already exists!');
      } else {
        knex('playlists').insert(playlist)
          .then(() => console.log(`Playlist ${playlist.playlist_name} successfully added!`))
          .catch(err => console.log(err));
      }
    })
    .catch(err => console.log(err));
};

module.exports = Playlist;

//  Sample response for API calls:
//  {
//    playlist_id: '4LbFHmTvu6bQldLAiCQ8KG',
//    playlist_name: 'The Needle 20170518',
//    playlist_tracks: '["04fW4RG70p6uQD4fgd9maA", "06Q6ffj6cl2miQPSzylS6X", ...]',
//    playlist_tracks_total: 300
//  }
