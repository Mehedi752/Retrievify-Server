const express = require('express')
const app = express()
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const { default: axios } = require('axios')
require('dotenv').config()

const port = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded())


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins or specify your frontend URL
    methods: ['GET', 'POST']
  }
});

// Store ID: retri67e5d7fc514bc
// Store Password (API/Secret Key): retri67e5d7fc514bc@ssl
// Merchant Panel URL: https://sandbox.sslcommerz.com/manage/ (Credential as you inputted in the time of registration)
// Store name: testretriadpi
// Registered URL: www.retrievify.com
// Session API to generate transaction: https://sandbox.sslcommerz.com/gwprocess/v3/api.php
// Validation API: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?wsdl
// Validation API (Web Service) name: https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php

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
    const paymentCollection = client.db('teamProject').collection('payments');
    const feedbackCollection = client.db('teamProject').collection('feedbacks');
    const messagesCollection = client.db('teamProject').collection('messages');

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


    // Claims section starts 
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
                    $expr: { $eq: ["$_id", "$$postId"] }
                  }
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
              receiptUrl: 1,
              imageUrl: 1,
              details: 1,
              createdAt: 1,
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
    // Claims section ends


    // Payment section starts
    app.post('/create-payment-method', async (req, res) => {
      const payment = req.body;
      console.log("Payment data : ", payment)

      const transactionId = new ObjectId().toString();
      console.log("Transaction ID : ", transactionId)
      payment.transactionId = transactionId;
      const customerName = payment.name, customerEmail = payment.email;

      const initiate = {
        store_id: 'retri67e5d7fc514bc',
        store_passwd: 'retri67e5d7fc514bc@ssl',
        total_amount: payment.amount,
        currency: 'BDT',
        tran_id: transactionId,
        success_url: 'http://localhost:5000/success-payment',
        fail_url: 'http://localhost:5173/fail',
        cancel_url: 'http://localhost:5173/cancel',
        ipn_url: 'http://localhost:5000/ipn-success-payment',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: customerName,
        cus_email: customerEmail,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: customerName,
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };

      const initResponse = await axios({
        method: 'POST',
        url: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
        data: initiate,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })
      console.log("Init Response : ", initResponse?.data?.GatewayPageURL)
      const gatewayURL = initResponse?.data?.GatewayPageURL;

      const savePaymentData = await paymentCollection.insertOne(payment);
      res.send({ gatewayURL });
    })

    app.post('/success-payment', async (req, res) => {
      const paymentSuccessData = req.body;
      console.log("Payment Success Data : ", paymentSuccessData)

      const isValidPayment = await axios.get(`https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${paymentSuccessData.val_id}&store_id=retri67e5d7fc514bc&store_passwd=retri67e5d7fc514bc@ssl&format=json`)
      // console.log("Payment Validation Response : ", isValidPayment?.data)
      // console.log("Payment Validation Response : ", isValidPayment?.data?.status)
      if (isValidPayment?.data?.status !== 'VALID') {
        return res.send({ message: 'Invalid Payment' })
      }

      //Update data in payment collection
      const query = { transactionId: paymentSuccessData.tran_id };
      const updateDoc = {
        $set: {
          status: 'success',
        }
      };
      const result = await paymentCollection.updateOne(query, updateDoc);
      res.redirect('http://localhost:5173/success')
    })


    // Feedback section starts
    app.post('/feedbacks', async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    app.get('/feedbacks', async (req, res) => {
      const feedbacks = await feedbackCollection.find({}).toArray();
      res.send(feedbacks);
    });




 

    app.get('/get-chats/:userId', async (req, res) => {
        const currentUserId = req.params.userId;
        try { 
            const messages = await messagesCollection.find({
                $or: [
                    { sender: currentUserId },
                    { receiver: currentUserId }
                ]
            }).toArray();
    
            if (messages.length === 0) return res.status(200).json([]);
    
            const chatUsers = {};
    
            for (const msg of messages) {
                const otherUserId = msg.sender === currentUserId ? msg.receiver : msg.sender;
                
                if (!chatUsers[otherUserId] || new Date(msg.timestamp) > new Date(chatUsers[otherUserId].timestamp)) {
                    chatUsers[otherUserId] = {
                        lastMessage: msg.text,
                        timestamp: msg.timestamp
                    };
                }
            }
            
    
            const uniqueUserIds = Object.keys(chatUsers).map(id => new ObjectId(id));
    
            const users = await userCollection.find({
                _id: { $in: uniqueUserIds }
            }).toArray();
    
            const response = users.map(user => {
              let text = chatUsers[user._id.toString()].lastMessage
              return ({
                userName: user.name,
                  email: user.email,
                  lastMessage: text.length  > 23 ? text.slice(0, 6) + "..." : text,
                  timestamp: chatUsers[user._id.toString()].timestamp
              })
            }); 
            return res.status(200).json(response);
        } catch (error) {
            console.error('Error fetching users and last messages:', error);
            return res.status(500).json({ message: 'Server error.' });
        }
    });
    

    app.get('/messages', async (req, res) => {
      try {
          const { sender, receiver } = req.query; 

          const messages = await messagesCollection.find({
              $or: [
                  { sender, receiver },
                  { sender: receiver, receiver: sender }
              ]
          }).sort({ timestamp: 1 }).toArray();
          
          res.json(messages);
      } catch (error) {
          res.status(500).json({ error: "Failed to fetch messages" });
      }
  });

   
io.on('connect', (socket) => {
  socket.on('authenticate', (userId) => { 
    socket.join(userId.toString());
    console.log(`User ${userId} joined their room`);
  });

  socket.on('sendMessage', async (data) => {
    console.log(data);

    const message = {
      sender: data.sender,
      text: data.text,
      receiver: data.receiver,
      timestamp: new Date()
    };
     
    await messagesCollection.insertOne(message);
       
    io.to(data.receiver).emit('receiveMessage', message);

  });
 
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello Programmer!')
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
