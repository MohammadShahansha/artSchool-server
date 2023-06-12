const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SK)
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'})
  }
  //bearer and token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ysflwyz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db('artcraft').collection('classes');
    const userCollection = client.db('artcraft').collection('users');
    const selectedClassCollection = client.db('artcraft').collection('selectedClass');
    const instructorCollection = client.db('artcraft').collection('instructor');
    const addedClassCollection = client.db('artcraft').collection('addedClass');


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_TOKEN, {expiresIn: '24h'})
      res.send({token})
    })

    //user related API----------------------------------------------------
    app.post('/users', async(req, res) => {
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.get('/users', async(req, res)=> {
      const result = await userCollection.find().toArray();
      res.send(result)
    })
//--------------------------------API for creating a admin-------------------------------------------------
    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })
    app.get('/users/admin/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const user = await userCollection.findOne(query)
      const result = {admin: user?.role === 'admin'}
      res.send(result)
    })

    //---------------------------api for creating an instructor--------------------------
    app.patch('/users/instructor/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })
    app.get('/users/instructor/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email}
      const user = await userCollection.findOne(query)
      const result = {instructor: user?.role === 'instructor'}
      res.send(result)
    })





    //class related api-----------------------------------------
    app.get('/classes', async (req, res) => {
      // const result = await classCollection.find().toArray();
      // res.send(result);
      const result = await classCollection.find().toArray();
      const sortResult = result.sort((a, b) => parseInt(b.students) - parseInt(a.students))
      res.send(sortResult)
    })
    app.get('/allclasses', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })
    app.post('/classes', async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item)
      res.send(result);
    })


    // instructor Related api----------------------------------------------------------------
    app.get('/allinstructor', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      const sortResult = result.sort((a, b) => parseInt(b.students) - parseInt(a.students))
      res.send(sortResult)
    })
    app.get('/instructor', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })
    app.post('/instructor', async (req, res) => {
      const item = req.body;
      const result = await instructorCollection.insertOne(item)
      res.send(result);
    })


    //selected Related API---------------------------------------------
    app.post('/selectedclass', async (req, res) => {
      const item = req.body;
      const result = await selectedClassCollection.insertOne(item)
      res.send(result);
    })

    app.get('/selectedclass', async (req, res) => {
      const email = req.query.email;
      // console.log(email)
      if (!email) {
        return res.send([])
      }

      // const decodedEmail = req.decoded.email;
      // if(email !== decodedEmail){
      //   return res.status(403).send({error: true, message:'forbidden access'})
      // }

      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    })

    app.delete('/selectedclass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result)
    })

    //*****************************added class related api*********************************
    app.post('/addedclass', async (req, res) => {
      const item = req.body;
      const result = await addedClassCollection.insertOne(item)
      res.send(result);
    })
    app.get('/addedclass', async (req, res) => {
      const result = await addedClassCollection.find().toArray();
      res.send(result);
    })

    app.patch('/added/approve/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: 'approve'
        },
      }
      const result = await addedClassCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    //***********************Payment related api********************** */
    app.post('/create-payment-intent', async (req, res) => {
      let {price} = req.body;
      // price=JSON.parse(price)
      // let body=JSON.parse(req.body);
      // console.log(req.body)
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('assignment twelve is running')
})
app.listen(port, () => {
  console.log(`assignment twelve runnint on port ${port}`)
})