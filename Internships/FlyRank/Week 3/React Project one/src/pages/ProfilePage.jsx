import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import './ProfilePage.css';

function ProfilePage() {
  const { user, logout } = useAuth();
  const { favorites, loading } = useFavorites();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <section className="page-section">
      <div className="page-section__header">
        <h1>Your profile</h1>
        <p>Manage your AnimeVerse account.</p>
      </div>

      <div className="profile-card">
        <div className="profile-card__row">
          <span className="profile-card__label">Email</span>
          <span className="profile-card__value">{user?.email}</span>
        </div>

        <div className="profile-card__row">
          <span className="profile-card__label">Account created</span>
          <span className="profile-card__value">{memberSince}</span>
        </div>

        <div className="profile-card__row">
          <span className="profile-card__label">Favorites saved</span>
          <span className="profile-card__value">{loading ? '…' : favorites.length}</span>
        </div>

        <button className="profile-card__logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </section>
  );
}

export default ProfilePage;
