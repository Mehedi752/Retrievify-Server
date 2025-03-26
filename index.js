const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xk6aw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect()
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )

    const userCollection = client.db('teamProject').collection('users');
    const postCollection = client.db('teamProject').collection('posts');


    //Users Related API
    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }
      const result = await userCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const users = await userCollection.find({}).toArray()
      res.send(users)
    })

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const user = await userCollection.findOne(query)
      res.send(user)
    })

    app.post('/posts', async (req, res) => {
      const post = req.body
      const result = await postCollection.insertOne(post)
      res.send(result)
    })

    app.get('/posts', async (req, res) => {
      const posts = await postCollection.find({}).toArray()
      res.send(posts)
    })

    app.get('/posts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const post = await postCollection.findOne(query)
      res.send(post)
    })

    app.get('/posts/latest/topSix', async (req, res) => {
      const posts = await postCollection
        .find()
        .sort({ timestamp: -1 })
        .limit(6)
        .toArray()
      res.send(posts)
    })

    app.get('/posts/myAdded/:email', async (req, res) => {
      const userEmail = req.params.email
      const query = { ownerEmail: userEmail }
      const posts = await postCollection.find(query).toArray()
      res.send(posts)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello Programmer!')
})

app.listen(port, () => {
  console.log(`Team Project is running on port ${port}`)
})