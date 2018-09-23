// import dependencies
const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

// method to return an Express.js server
const server = jsonServer.create();
// method to return an Express.js router
const router = jsonServer.router('./database.json')
// set middlewares
server.use(jsonServer.defaults());
server.use(bodyParser.urlencoded({extended: true}))
server.use(bodyParser.json())

// functions to create a token from a payload, 
// verify the token and 
// check if the user exists in database 
// (we read and parse the database.json file and access the users array)
const createToken = (payload) => jwt.sign(payload, 'SECRET_KEY', { expiresIn: '1h'});
const verifyToken = (token) => jwt.verify(token, 'SECRET_KEY');

const userdb = JSON.parse(fs.readFileSync('./database.json', 'UTF-8')).users || [];

const isAuthenticated = ({email, password}) => {
    return userdb.findIndex(user => user.email === email && user.password === password) !== -1
}

// POST(/auth/login) endpoint which verifies if the user exist in the database
// and then create and send a response with an acces token to user
server.post('/auth/login', (req, res) => {
    const {email, password} = req.body
    if (isAuthenticated({email, password}) === false) {
        const status = 401
        const message = 'Incorrect email or password'
        res.status(status).json({status, message})
        return
    }
    const access_token = createToken({email, password})
    res.status(200).json({access_token})
})

// Express.js middleware that checks if the authorization header has the Bearer scheme then verifies if the token is valid for all routes except the route(s) starting with /auth/ and for all requests except GET requests
server.use(/^(?!\/auth).*$/, (req, res, next) => {
    if(req.method === 'GET'){
        next();
    } else {
        if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
            const status = 401
            const message = 'Bad authorization header'
            res.status(status).json({status, message})
            return
        }
        try {
          verifyToken(req.headers.authorization.split(' ')[1])
          next()
        } catch (err) {
            const status = 401
            const message = 'Error: access_token is not valid'
            res.status(status).json({status, message})
        }
    }
})

// mount json-server then run the server on port 3000
server.use(router)
server.listen(3000, () => {
    console.log('Server running...')
})
