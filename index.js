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
        let requestCollection = client.db("SovereignAssets").collection("requests");
        let customRequestCollection = client.db("SovereignAssets").collection("customRequests");

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

        // GET ADMIN SPECIFIC PRODUCT COUNT 
        app.get("/productCount/:email", async (req, res) => {
            const email = req.params.email;
            const query = {
                assetPostedBy: email
            };
            const productCount = await assetsCollection.countDocuments(query);
            res.send({ productCount: productCount });
        });

        // GET AVAILABLE EMPLOYEES DATA TO ADD TO TEAM AS AN ADMIN 
        app.get('/availableEmployees', async (req, res) => {
            const availableEmployees = await usersCollection.find({ companyName: "null" }).toArray();
            res.json(availableEmployees);
        });


        // ADD EMPLOYEE TO TEAM BY ADMIN 
        app.patch('/addToTeam/:id', async (req, res) => {
            const userId = req.params.id;
            const currentUserEmail = req.body.currentUserEmail;

            const userToUpdate = await usersCollection.findOne({ _id: new ObjectId(userId) });

            if (!userToUpdate) {
                return res.status(404).send("User to update not found");
            }

            const currentUser = await usersCollection.findOne({ email: currentUserEmail });

            if (!currentUser) {
                return res.status(404).send("Current User Not Found");
            }

            const result = await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        companyName: currentUser.companyName,
                        companyLogo: currentUser.companyLogo,
                    },
                }
            );

            const decrementResult = await usersCollection.updateOne(
                { email: currentUserEmail },
                {
                    $inc: { availableEmployees: -1 },
                }
            );
            res.send(result);
        });


        // GET TEAM MEMBERS OF THE CURRENT USER ADMIN 
        app.get('/getUsersByCompanyName/:companyName', async (req, res) => {
            const companyName = req.params.companyName;

            try {
                const result = await usersCollection.find({ 'companyName': companyName }).toArray();

                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // REMOVE MEMBER FROM TEAM AS AN ADMIN 
        app.patch('/removeFromTeam/:id', async (req, res) => {
            const userId = req.params.id;
            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { companyName: "null", companyLogo: "null" } }
                );

                res.send(result);
            } catch (updateErr) {
                console.error(updateErr);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });


        // GET COMPANY ASSET LIST AS AN EMPLOYEE 
        app.get('/getTeamAssets/:companyName', async (req, res) => {
            const companyName = req.params.companyName;
            const { productType, status, productName } = req.query;

            try {
                const filter = {
                    assetCompany: companyName,
                    ...(productType && { productType }),
                    ...(status && { status }),
                    ...(productName && { productName: new RegExp(productName, 'i') }),
                };

                const result = await assetsCollection.find(filter).toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });

        // POST REQUEST DATA IN REQUEST COLLECTION AS AN USER 
        app.post('/assetRequest', async (req, res) => {
            const requestData = req.body;
            let result = await requestCollection.insertOne(requestData);
            res.send(result);
        });

        // CHANGE ASSET STATUS AFTER REQUESTING ASSET AN EMPLOYEE
        app.patch('/changeAssetStatus/:id', async (req, res) => {
            const assetId = req.params.id;

            let result = await assetsCollection.updateOne(
                { _id: new ObjectId(assetId) },
                { $set: { status: 'Pending' } }
            );

            res.send(result);
        });

        // GET REQUESTED ASSETS DATA AS AN ADMIN 
        app.get('/allRequests/:companyName', async (req, res) => {
            const companyName = req.params.companyName;
            const { requestorName } = req.query;

            const filter = {
                assetCompany: companyName,
            };

            if (requestorName) {
                const searchRegex = new RegExp(requestorName, 'i');
                filter.requestorName = searchRegex;
            }
            const result = await requestCollection.find(filter).toArray();

            res.send(result);
        });

        // CHANGE STATUS TO APPROVE AFTER REQUEST IS APPROVED AS AN ADMIN 
        app.patch('/statusApproved/:id', async (req, res) => {
            const requestId = req.params.id;
            const currentDate = new Date();

            const result = await requestCollection.updateOne(
                { _id: new ObjectId(requestId) },
                { $set: { requestStatus: 'Approved', approvalDate: currentDate } }
            );

            res.send(result);
        });


        // DECREASE PRODUCT COUNT IN ASSET COLLECTION AFTER REQUEST IS APPROVED AS AN ADMIN 
        app.patch('/changeAssetQuantity/:assetId', async (req, res) => {
            const assetId = req.params.assetId;

            const result = await assetsCollection.updateOne(
                { _id: new ObjectId(assetId) },
                { $inc: { productQuantity: -1 }, $set: { status: 'Approved' } }
            );

            res.send(result);
        });


        // CHANGE REQUEST STATUS TO REJECTED AFTER REQUEST IS APPROVED AS AN ADMIN 
        app.patch('/statusRejected/:id', async (req, res) => {
            const requestId = req.params.id;

            const result = await requestCollection.updateOne(
                { _id: new ObjectId(requestId) },
                { $set: { requestStatus: 'Rejected', approvalDate: "null" } }
            );
            res.send(result);
        });

        // CHANGE ASSET STATUS AFTER REQUEST IS APPROVED AS AN ADMIN 
        app.patch('/changeAssetStatus/:assetId', async (req, res) => {
            const assetId = req.params.assetId;

            const result = await assetsCollection.updateOne(
                { _id: new ObjectId(assetId) },
                { $set: { status: 'Not-Requested' } }
            );

            res.send(result);
        });



        // GET REQUESTED ITEM DATA AS AN EMPLOYEE 
        app.get('/getRequestedData/:currentUserEmail', async (req, res) => {
            const currentUserEmail = req.params.currentUserEmail;
            const { assetType, requestStatus, assetName } = req.query;

            // Build a query object based on the provided parameters
            const query = {
                requestorEmail: currentUserEmail,
            };

            if (assetType) {
                query.assetType = assetType;
            }

            if (requestStatus) {
                query.requestStatus = requestStatus;
            }

            if (assetName) {
                // Use a case-insensitive regex for partial matching on assetName
                query.assetName = { $regex: new RegExp(assetName, 'i') };
            }

            // Query the requestCollection based on the constructed query
            const result = await requestCollection.find(query).toArray();

            res.send(result);
        });

        // CANCEL REQUEST DATA AS AN EMPLOYEE 
        app.delete('/deleteRequest/:id', async (req, res) => {
            const requestId = req.params.id;
            const result = await requestCollection.deleteOne({ _id: new ObjectId(requestId) });
            res.send(result);
        });

        // CHANGE STATUS TO RETURNED AFTER ASSET IS RETURNED BY EMPLOYEE 
        app.patch('/returnAsset/:id', async (req, res) => {
            const requestId = req.params.id;

            const result = await requestCollection.updateOne(
                { _id: new ObjectId(requestId) },
                { $set: { requestStatus: 'Returned' } }
            );

            res.send(result);
        });

        // INCREASE PRODUCT COUNT AFTER ASSET IS RETURNED BY EMPLOYEE 
        app.patch('/returnAssetCount/:assetId', async (req, res) => {
            const assetId = req.params.assetId;

            const result = await assetsCollection.updateOne(
                { _id: new ObjectId(assetId) },
                { $inc: { productQuantity: 1 } }
            );

            res.send(result);
        });

        // GET ASSET DATA BY ID FOR PDF 
        app.get('/getAssetDataPDF/:id', async (req, res) => {
            const assetId = req.params.id;
            const result = await assetsCollection.findOne({ _id: new ObjectId(assetId) });
            res.send(result);
        });

        // POST CUSTOM REQUESTS DATA AS AN EMPLOYEE 
        app.post('/customRequest', async (req, res) => {
            const customRequestData = req.body;
            let result = await customRequestCollection.insertOne(customRequestData);
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

        // UPDATE ADMIN INFO AFTER PACKAGE IS UPGRADED 

        app.patch('/upgradePackage/:email', async (req, res) => {
            const { email } = req.params;
            const { increasbleEmployees } = req.body;

            try {
                const filter = { email: email };

                const existingUser = await usersCollection.findOne(filter);
                const currentAvailableEmployees = existingUser.availableEmployees || 0;

                const newAvailableEmployees = currentAvailableEmployees + increasbleEmployees;

                const updateResult = await usersCollection.updateOne(filter, {
                    $set: {
                        availableEmployees: newAvailableEmployees,
                    }
                });

                res.send(updateResult);
            } catch (error) {
                console.error(error);
                res.status(500).send("Internal Server Error");
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