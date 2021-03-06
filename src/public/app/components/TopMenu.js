import React from 'react';
import Select from 'react-select';
import { connect } from 'react-redux';
import SweetScroll from 'sweet-scroll';

import SelectGenre from './SelectGenre';
import SelectCountry from './SelectCountry';

const mapStateToProps = state => ({
  auth: state.auth,
  showTopMenu: state.showTopMenu,
  showUserMenu: state.showUserMenu,
  showCountryDropdown: state.showCountryDropdown,
  currentCountry: state.currentCountry,
  currentGenre: state.currentGenre,
  windowWidth: state.windowWidth,
})

const mapDispatchToProps = dispatch => ({
  handleSetCountry: (country) => dispatch({ type: 'SET_CURRENT_COUNTRY', country }),
  handleClearCountry: () => dispatch({ type: 'CLEAR_CURRENT_COUNTRY' }),
  handleSetGenre: (genre) => dispatch({ type: 'SET_CURRENT_GENRE', genre }),
  handleClearGenre: () => dispatch({ type: 'CLEAR_CURRENT_GENRE' }),
  handleHideCountryDropdown: () => dispatch({ type: 'HIDE_COUNTRY_DROPDOWN' }),
  handleShowCountryDropdown: () => dispatch({ type: 'SHOW_COUNTRY_DROPDOWN' }),
})

const TopMenu = ({
  auth,
  showTopMenu,
  showFavoritesMenu,
  showUserMenu,
  showCountryDropdown,
  toggleTopMenu,
  toggleFavoritesMenu,
  toggleSideMenu,
  toggleUserMenu,
  currentCountry,
  currentGenre,
  handleSetCountry,
  handleClearCountry,
  handleHideCountryDropdown,
  handleShowCountryDropdown,
  handleSetGenre,
  handleClearGenre,
  windowWidth,
  }) => {

  const scrollUp = () => {
    const sweetScroll = new SweetScroll();
    sweetScroll.to(0, 0);
  };

  let height = window.innerHeight - 63;

  window.onscroll = () => {
    if (window.pageYOffset >= height && showTopMenu === false) {
      toggleTopMenu();
    }
    else if (window.pageYOffset < height && showTopMenu === true) {
      toggleTopMenu();
    }
  }

/*
style={{
  width: showTopMenu ? '160px' : '300px',
  top: showTopMenu ? '0px' : '40px'}}
*/

  return (
    <div
      className="TopMenu"
      style={{ background: showTopMenu ? 'linear-gradient(to bottom, #202020 0%, #282828 50%, #202020 100%)' : 'rgba(0, 0, 0, 0)',
               boxShadow: showTopMenu ? '2px 4px 3px rgba(0, 0, 0, 0.3)' : '2px 4px 3px rgba(0, 0, 0, 0)' }}
    >

      <div className="Menu--logo">
        <img
          src="../../assets/worldfm4.svg"
        />
      </div>

      <div className="TopMenu__content" style={{ width: windowWidth }}>

        <div
          className="GlobeView--toggle TopMenu__icon"
        >
          <i
            className="fa fa fa-globe fa-4x fa-fw"
            onClick={scrollUp}
            data-tip="Select a new country"
          />
        </div>

        <div className="TopMenu__dropdownOptions">
          <span
            onClick={handleShowCountryDropdown}
            style={{ color: showCountryDropdown ? 'rgb(30, 215, 96)' : 'grey' }}
            data-tip="Explore the world of music" >COUNTRY
          </span>
          <span
            onClick={handleHideCountryDropdown}
            style={{ color: !showCountryDropdown ? 'rgb(30, 215, 96)' : 'grey' }}
            data-tip="Explore the world of genres" >GENRE
          </span>
        </div>

        { showCountryDropdown ?
        <div className="TopMenu--CountryDropdown">
          <SelectCountry
            currentCountry={currentCountry}
            handleSetCountry={handleSetCountry}
            handleClearGenre={handleClearGenre}
          />
        </div>
        : null }

        { !showCountryDropdown ?
        <div className="TopMenu--GenreDropdown">
          <SelectGenre
            currentGenre={currentGenre}
            handleSetGenre={handleSetGenre}
            handleClearCountry={handleClearCountry}
          />
        </div>
        : null }

        <div
          className="FavoritesMenu--toggle TopMenu__icon"
          style={{
            opacity: auth ? 1 : 0,
            zIndex: auth ? 10 : -80
          }}
        >
          <i
            className="fa fa fa-heart fa-lg fa-fw"
            onClick={() => {
              if(auth) toggleFavoritesMenu();
            }}
            data-tip="Favorites"
          />
        </div>

        <a className="TopMenu--login TopMenu__icon" href="/auth/spotify">
          <i
            className="fa fa fa-spotify fa-lg fa-fw"
            style={{ color: auth ? 'rgb(30, 215, 96)' : 'rgb(230, 230, 230)' }}
            data-tip="Connect with Spotify"
          />
        </a>


        {/* { auth ?
          <div className="TopMenu--user">
            <i
              className="TopMenu--login fa fa fa-spotify fa-2x fa-fw"
              style={{ color: auth ? 'rgb(30, 215, 96)' : 'rgb(230, 230, 230)' }}
            />
            <i className= {showUserMenu ? "fa fa fa-chevron-up fa-1x fa-fw TopMenu__icon" : "fa fa fa-chevron-down fa-1x fa-fw TopMenu__icon" } onClick={toggleUserMenu} />
          </div> : null}

        {

          showUserMenu ?
          <div className="TopMenu--userMenu" style={{ backgroundColor: showTopMenu ? '#080808' : 'rgba(0, 0, 0, 0)' }}>
            <div onClick={toggleFavoritesMenu} className="TopMenu__icon">
              <i className="fa fa fa-heart fa-lg fa-fw" />
              <span>favorites</span>
            </div>
            <div className="TopMenu__icon">
              <a href="/auth/spotify">
                <i className="fa fa fa-sign-out fa-lg fa-fw" />
                <span>logout</span>
              </a>
            </div>
          </div>
        : null } */}

      </div>
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(TopMenu);
