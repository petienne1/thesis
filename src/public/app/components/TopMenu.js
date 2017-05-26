import React from 'react';

const TopMenu = ({ toggleCountryMenu, toggleSpotifyPlaylist, toggleTrackInfo, toggleSideMenu }) => {
  return (
    <div className="Menu">
      <i className="Mobile--icon fa fa-bars fa-2x fa-fw" onClick={toggleSideMenu}></i>
      <h1 className='Menu--logo'>world.fm</h1>
      <div className="Desktop">
        <span className="Menu--toggle" onClick={toggleTrackInfo}>Info</span>
        <span className="CountryMenu--toggle" onClick={toggleCountryMenu}>Countries</span>
        <span className="SpotifyPlaylist--toggle" onClick={toggleSpotifyPlaylist}>Playlist</span>
        <span className="Menu--login" href="/auth/spotify">Login</span>
      </div>
    </div>
  )
}

export default TopMenu;