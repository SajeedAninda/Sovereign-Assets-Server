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


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        let assetsCollection = client.db("SovereignAssets").collection("assets");

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

        // GET USER DATA 
        app.get("/userData/:email", async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email,
            };
            const result = await usersCollection.findOne(query);
            // console.log(result);
            res.send(result);
        });

        // ADD ASSETS AS AN ADMIN 
        app.post("/addAsset", async (req, res) => {
            const assets = req.body;
            const result = await assetsCollection.insertOne(assets);
            // console.log(result);
            res.send(result);
        });

        //   GET ADMIN SPECIFIC ASSET LIST
        app.get("/assetList/:email", async (req, res) => {
            const email = req.params.email;
            const productType = req.query.productType;
            const sort = req.query.sort;
            const status = req.query.status;
            let productName = req.query.productName;

            const query = {
                assetPostedBy: email,
            };

            // Applying filter based on productType
            if (productType) {
                query.productType = productType;
            }

            // Applying filter based on status
            if (status) {
                query.status = status;
            }

            // SORTING
            const sortOption = {};
            if (sort) {
                sortOption.productQuantity = sort === 'asc' ? 1 : -1;
            }
            // SEARCHING
            if (productName) {
                query.productName = { $regex: new RegExp(req.query.productName, 'i') };
            }

            try {
                const results = await assetsCollection.find(query).sort(sortOption).toArray();
                if (results.length > 0) {
                    res.send(results);
                } else {
                    res.status(404).send("No matching assets found");
                }
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
            }
        });

        // DELETE ASSETS FROM LIST AS AN ADMIN 
        app.delete("/assetList/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id),
            };
            const result = await assetsCollection.deleteOne(query);
            res.send(result);
        });

        //   GET ASSET LIST TO UPDATE AS AN ADMIN
        app.get("/updateAsset/:id", async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id),
            };
            const result = await assetsCollection.findOne(query);
            res.send(result);
        });

        //UPDATE ASSET LIST AS AN ADMIN 
        app.patch("/updateAsset/:id", async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedList = {
                $set: {
                    productName: data.productName,
                    productType: data.productType,
                    productQuantity: data.productQuantity
                },
            };
            const result = await assetsCollection.updateOne(
                filter,
                updatedList,
                options
            );
            res.send(result);
        });


        // =====================STRIPE PAYMENT RELATED ROUTES =========================

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