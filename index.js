const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');

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
    const selectedClassCollection = client.db('artcraft').collection('selectedClass');
    const instructorCollection = client.db('artcraft').collection('instructor');
    

    //class related api-----------------------------------------
    app.get('/classes', async(req, res) => {
      // const result = await classCollection.find().toArray();
      // res.send(result);
      const result = await classCollection.find().toArray();
      const sortResult = result.sort((a,b)=>parseInt(b.students)-parseInt(a.students))
      res.send(sortResult)
    })
    app.get('/allclasses', async(req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    // instructor Related api----------------------------------------------------------------
    app.get('/allinstructor', async(req, res) => {
      const result = await instructorCollection.find().toArray();
      const sortResult = result.sort((a,b)=>parseInt(b.students)-parseInt(a.students))
      res.send(sortResult)
    })
    app.get('/instructor', async(req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })


    //selected Related API---------------------------------------------
    app.post('/selectedclass', async(req, res) => {
      const item = req.body;
      const result = await selectedClassCollection.insertOne(item)
      res.send(result);
    })

    app.get('/selectedclass', async(req, res)=> {
      const email = req.query.email;
      // console.log(email)
      if(!email){
        return res.send([])
      }
      const query = {email: email};
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
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