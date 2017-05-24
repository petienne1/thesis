import React from 'react';
import Song from './Song';
import Menu from './Menu';

const Songs = ({ playlist, onClick, windowWidth, onWindowResize, currentSong }) => {
  window.onresize = () => onWindowResize(window.innerWidth);
  let width = 0;
  if (windowWidth < 500) {
    width = windowWidth / 2;
  }
  else if (windowWidth < 800) {
    width = windowWidth / 3;
  }
  else if (windowWidth < 1100) {
    width = windowWidth / 4;
  }
  else if (windowWidth < 1450) {
    width = windowWidth / 5;
  }
  else  {
    width = windowWidth / 6;
  }
  return (
    <div
      className="Playlist"
      style={{
        width: windowWidth,
      }}
    >
      {
        playlist.map((listItem, idx) => (
        <Song
          key={listItem.track_id}
          ranking={idx + 1}
          track={listItem}
          size={width}
          onClick={onClick}
          currentSong={currentSong}
        />
      ))}

    </div>
  );
}

export default Songs;