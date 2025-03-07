const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 5000;                  //Save the port number where your server will be listening
const http = require("http");
const { neon } = require("@neondatabase/serverless");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const helmet = require('helmet');
const cors =require('cors')
import { rateLimit } from 'express-rate-limit'

//Idiomatic expression in express to route and respond to a client request
app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile('index.html', {root: __dirname});      //server responds by sending the index.html file to the client's browser
                                                        //the .sendFile method needs the absolute path to the file, see: https://expressjs.com/en/4x/api.html#res.sendFile 
});

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis, Memcached, etc. See below.
})


dotenv.config();
app.use(express.json());
app.use(helmet());
app.use(limiter);
app.use(cors());
//app.use(cors({ origin: 'https://your-allowed-origin.com' }));


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

//Get all users
app.get('/usuarios',async (req,res)=>{
    try{
    const result=await pool.query('SELECT * FROM usuarios');
    res.json(result.rows); 
    }catch(err) {
        console.error(err);
        res.status(500).json({ message: 'database error' });

    } 
  });

 // Registrar un nuevo usuario
 app.post('/register', async (req, res) => {
    const { email, password,empleado } = req.body;
  
    // Check if the email already exists
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Usuario ya existe' });
    }
  const intempleado=parseInt(empleado)
    // Hasher la contraseña
    const hashedPassword = await bcrypt.hash(password, process.env.SALT);
  
    // Insertar usuario nuevo a la base
    await pool.query('INSERT INTO usuarios (email, contrasena,empleado) VALUES ($1, $2, $3)', [email, hashedPassword,intempleado]);
  
    res.status(201).json({ message: 'User registered successfully' });
  });

 // Login
 app.post('/login', async (req, res) => {
    
    const email = req.body.email;
    const password=req.body.password;
    console.log(email);
    console.log(password);
    console.log(req.body);
  
    // Find the user in the database
    const result = await pool.query("SELECT * FROM usuarios WHERE email=$1", [email]);
    const user = result.rows[0];
    console.log(user);
    if (user==0) {
      return res.status(400).json({ message: 'Invalid email or password ' });
    }
    
  if(password==user.contrasena){
    // Crear un JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    console.log(token);
    res.json({ token });
  }else{
    return res.status(400).json({ message: 'Invalid email or password :(' });
  }
    
  });



app.listen(port, () => {            //iniciar puerto
    console.log(`Now listening on port ${port}`); 
});