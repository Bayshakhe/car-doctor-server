const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qlguchx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  console.log(authorization)
  if(!authorization){
    return res.status(401).send({error:true, message: 'Unauthorize access'})
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error){
      return res.status(403).send({error: true, message: 'Unauthorize access'})
    }
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection = client.db("carDoctor").collection("services");
    const checkoutCollection = client.db("carDoctor").collection("checkout")

    

    // SERVICES
    app.get('/services', async(req,res) => {
      const sort = req.query?.sort;
      const search = req.query?.search
      // const query = {}
      // const query = { price: { $gte: 100 } }
      const query = {title:{$regex:search, $options : "i"}}
      const options = {
        sort: { "price": sort === 'asc' ? 1 : -1 },
      };
        const cursor = servicesCollection.find(query, options);
        const result = await cursor.toArray();
        res.send(result)
    })

    app.get(`/services/:id`, async (req,res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        // const options = {
        //     projection: { _id: 0, title: 1, img: 1 },
        //   };
        // const result = await servicesCollection.findOne(query,options);
        const result = await servicesCollection.findOne(query);
        res.send(result)
    })

    // CHECKOUT
    app.post('/checkout', async (req, res) => {
      const order = req.body;
      const result = await checkoutCollection.insertOne(order)
      res.send(result)
    })

    app.get('/checkout', verifyJWT, async (req,res) => {
      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: 'Forbidden access'})
      }

      // console.log(req.query.email) 
      let query = {}
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await checkoutCollection.find(query).toArray();
      res.send(result)
    })

    app.patch('/checkout/:id', async(req,res)=>{
      const id = req.params.id;
      const updateCheckout = req.body
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set:{
          status: updateCheckout.status
        }
      }
      const result = await checkoutCollection.updateOne(filter,updateDoc)
      res.send(result)
    })

    app.delete('/checkout/:id', async (req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await checkoutCollection.deleteOne(query);
      // console.log(id,query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) => {

    res.send('Car Doctor Server is running');
    
})

// JWT
app.post('/jwt',(req,res) => {
  const user = req.body;
  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1h'
  },(error, token) => {
    if(error){
      return res.status(500).send({status: 0, message: error.message})
    }
    res.send({token})
  })
})

app.listen(port, (req,res) => {
    console.log('Car Doctor is running on port: ', port)
})

