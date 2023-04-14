import jwt from 'jsonwebtoken'

const secret = 'awesomesecret';
const expiration = '48hr';


const authMiddleware = function (req) {

  // console.log("req", req)
  let token = req.body.token || req.query.token || req.headers.authorization;

  if (req.headers.authorization) {
    token = token.split(' ').pop().trim();
  }

  if (!token) {
    return req;
  }

  try {
    const { data } = jwt.verify(token, secret, { maxAge: expiration });
    // console.log(data)
    req.user = data;

  } catch {
    console.log('Invalid token');
  }

  return req;
}
  
const signToken = function ({ email, username, _id }) {
  const payload = { email, username, _id };
  return jwt.sign({ data: payload }, secret, { expiresIn: expiration });
}

export { signToken };
export default authMiddleware;
