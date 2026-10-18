import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navbar.css';

const linkClassName = ({ isActive }) => `navbar__link${isActive ? ' active' : ''}`;

function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar__brand" onClick={() => setOpen(false)}>
        <span className="navbar__logo">AV</span>
        <span>AnimeVerse</span>
      </NavLink>

      <button
        className="navbar__menu-toggle"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="primary-navigation"
      >
        ☰
      </button>

      <nav id="primary-navigation" className={`navbar__links ${open ? 'open' : ''}`}>
        <NavLink to="/" className={linkClassName} onClick={() => setOpen(false)}>
          Home
        </NavLink>
        <NavLink to="/search" className={linkClassName} onClick={() => setOpen(false)}>
          Search
        </NavLink>
        <NavLink to="/favorites" className={linkClassName} onClick={() => setOpen(false)}>
          Favorites
        </NavLink>
        {user ? (
          <>
            <NavLink to="/profile" className={linkClassName} onClick={() => setOpen(false)}>
              Profile
            </NavLink>
            <button className="navbar__button" type="button" onClick={() => logout()}>
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/login" className={linkClassName} onClick={() => setOpen(false)}>
            Login
          </NavLink>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
