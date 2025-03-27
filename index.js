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
    const claimCollection = client.db('teamProject').collection('claims');

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
    // User related API End.


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

    app.delete('/posts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await postCollection.deleteOne(query)
      res.send(result)
    })

    app.put('/posts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const updatedPost = req.body
      const updateDoc = {
        $set: {
          type: updatedPost.type,
          name: updatedPost.name,
          image: updatedPost.image,
          category: updatedPost.category,
          location: updatedPost.location,
          phone: updatedPost.phone,
          description: updatedPost.description,
          ownerName: updatedPost.ownerName,
          ownerEmail: updatedPost.ownerEmail,
          ownerImage: updatedPost.ownerImage,
          timestamp: new Date(),
        },
      }
      const result = await postCollection.updateOne(query, updateDoc)
      res.send(result)
    })


    // claims section starts 

    app.post('/claims', async (req, res) => {
      const claim = req.body;
      claim.status = 'pending';
      const result = await claimCollection.insertOne(claim);
      res.send(result);
    });

    app.get('/claims', async (req, res) => {
      const claims = await claimCollection.find().toArray();
      res.send(claims);
    });

    app.get('/claims/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { claimantEmail: email };
      const claims = await claimCollection.find(query).toArray();
      res.send(claims);
    });

    app.patch('/claims/:id/status', async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;

      if (!['pending', 'verified', 'rejected'].includes(status)) {
        return res.status(400).send({ message: 'Invalid status' });
      }

      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        }
      };

      const result = await claimCollection.updateOne(query, updateDoc);

      if (status === 'verified') {
        const claim = await claimCollection.findOne(query);
        await postCollection.updateOne(
          { _id: new ObjectId(claim.postId) },
          { $set: { type: 'item-recovered' } }
        );
      }

      res.send(result);
    });
 
    app.get('/claims/:id', async (req, res) => {
        try {
            const id = req.params.id;
    
            const claim = await claimCollection.aggregate([
                { $match: { _id: new ObjectId(id) } },  
                {
                    $lookup: {
                        from: "posts",  
                        let: { postId: { $toObjectId: "$postId" } },  
                        pipeline: [
                            { 
                                $match: { 
                                    $expr: { $eq: ["$_id", "$$postId"] } }  
                            },
                            { 
                                $project: {  
                                    name: 1,
                                    category: 1,
                                    location: 1
                                }
                            }
                        ],
                        as: "postDetails"
                    }
                },
                { 
                    $unwind: { path: "$postDetails", preserveNullAndEmptyArrays: true }  
                },
                {
                    $project: {
                        _id: 1,
                        postId: 1,
                        status: 1,
                        postAuthor: 1,
                        claimantName: 1,
                        claimantEmail: 1,
                        claimantImage: 1,
                        receiptUrl:1,
                        imageUrl:1,
                        details:1,
                        createdAt:1,
                        "postDetails.name": 1,       
                        "postDetails.category": 1,
                        "postDetails.location": 1
                    }
                }
            ]).toArray();
            
            if (!claim.length) {
                return res.status(404).send({ message: "Claim not found" });
            }
            
            res.send(claim[0]);  
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    });
    
    app.delete('/claims/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        // const claim = await claimCollection.findOne(query);
        // if (claim.claimantEmail !== req.user.email) {
        //     return res.status(403).send({ message: 'Unauthorized' });
        // }

        const result = await claimCollection.deleteOne(query);

        if (result.deletedCount === 1) {
          res.send({ success: true, message: 'Claim deleted successfully' });
        } else {
          res.status(404).send({ message: 'Claim not found' });
        }
      } catch (error) {
        console.error('Error deleting claim:', error);
        res.status(500).send({ message: 'Error deleting claim' });
      }
    });
    // claims section ends

    
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