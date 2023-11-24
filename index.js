require('dotenv').config()
const express = require('express')
let cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// console.log(process.env.STRIPE_SECRET_KEY)

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
// app.use(cors());
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

        // POST EMPLOYEE DATA TO USER COLLECTION
        app.post("/employeeRegister", async (req, res) => {
            const user = req.body;
            //   console.log(user);
            const result = await usersCollection.insertOne(user);
            // console.log(result);
            res.send(result);
        });

        // POST EMPLOYEE DATA WITH SOCIAL LOGIN 
        app.post("/employeeSocialRegister", async (req, res) => {
            const userDetails = req.body;
            let checkEmail = userDetails.email;
            const existingUser = await usersCollection.findOne({ email: checkEmail });

            if (existingUser) {
                return res.status(409).json({ error: 'Email already exists' });
            }

            let result = await usersCollection.insertOne(userDetails);
            res.send(result);
        });

        // GET ADMIN DATA BEFORE PAYMENT 
        app.get("/paymentData/:email", async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email,
            };
            const result = await usersCollection.findOne(query);
            // console.log(result);
            res.send(result);
        });

        // STRIPE PAYMENT INTENT 
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            if (amount <= 0) {
                return res.send({
                    clientSecret: "Amount not valid",
                })
            }

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // UPDATE ADMIN INFO AFTER PAYMENT IS DONE 

        app.patch('/updateAdmin/:email', async (req, res) => {
            const { email } = req.params;
            const { role, payableAmount, paymentStatus } = req.body;

            try {
                const filter = { email: email };
                const update = {
                    $set: {
                        role: role,
                        payableAmount: payableAmount,
                        paymentStatus: paymentStatus
                    }
                };

                const result = await usersCollection.updateOne(filter, update);

                res.send(result);
            } catch (error) {
                console.error(error);
            }
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