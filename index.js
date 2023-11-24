require('dotenv').config()
const express = require('express')
let cors = require("cors");
const app = express()

app.use(cors());
app.use(express.json());


const port = process.env.PORT || 5000


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `${process.env.MONGO_URI}`;

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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });


        // DATABASE COLLECTIONS 
        let usersCollection = client.db("SovereignAssets").collection("users");

        // POST ADMIN DATA TO USER COLLECTION 
        app.post("/adminRegister", async (req, res) => {
            const user = req.body;
            //   console.log(user);
            const result = await usersCollection.insertOne(user);
            // console.log(result);
            res.send(result);
          });














        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Sovereign Server is Running!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})