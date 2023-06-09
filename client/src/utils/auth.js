import decode from 'jwt-decode';

function AuthService() {
  const getProfile = () => {
    return decode(getToken());
  };

  const loggedIn = () => {
    const token = getToken();
    // If there is a token and it's not expired, return `true`
    return token && !isTokenExpired(token) ? true : false;
  };

  const isTokenExpired = (token) => {
    // Decode the token to get its expiration time that was set by the server
    const decoded = decode(token);
    // If the expiration time is less than the current time (in seconds), the token is expired and we return `true`
    if (decoded.exp < Date.now() / 1000) {
      localStorage.removeItem('token');
      return true;
    }
    // If token hasn't passed its expiration time, return `false`
    return false;
  };

  const getToken = () => {
    return localStorage.getItem('token');
  };

  const login = (idToken) => {
    localStorage.setItem('token', idToken);
    window.location.assign('/');
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return {
    getProfile,
    loggedIn,
    isTokenExpired,
    getToken,
    login,
    logout,
  };
}

export default AuthService();