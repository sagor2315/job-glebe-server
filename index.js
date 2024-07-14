const express = require('express');
const app = express();
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleWare
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['https://b8a11-client-side-mdzahidulisl.web.app', 'https://b8a11-client-side-mdzahidulisl.firebaseapp.com'],
    // origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}))




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB_NAME}:${process.env.USER_PASS}@cluster0.3uv6jjc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// Middleware 

const checkLoggingData = (req, res, next) => {
    console.log("The logging info is", req.method, req.host)
    next()
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token
    console.log("token is here in verify", token);
    if (!token) {
        return res.status(401).send({ message: "You are not permitted to access it!" });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETS, (err, decoded) => {
        console.log(err)
        if (err) {
            return res.status(401).send({ message: "This is not accessible something wrong!" });
        }
        console.log("Value of token", decoded);
        req.user = decoded;
        next();
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const addedJobsCollection = client.db("jobGlebeDB").collection("addAJobData");
        const applyJobsCollection = client.db("jobGlebeDB").collection("applyJobData");

        // jwt related api or web token
        app.post("/jwt", checkLoggingData, async (req, res) => {
            const data = req.body;
            console.log("token for this data", data);
            const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECRETS, { expiresIn: '1h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true });
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('User logging situations now', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        // job data related api
        app.get("/addajob", checkLoggingData, async (req, res) => {

            console.log(req.query.email)

            let query = {};
            if (req.query?.email) {
                query = { email: req.query?.email }
            }

            const result = await addedJobsCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/addajob/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addedJobsCollection.findOne(query)
            res.send(result);
        })

        app.post("/addajob", async (req, res) => {
            const data = req.body;
            const result = await addedJobsCollection.insertOne(data);
            res.send(result);
        })


        app.put("/addajob/:id", async (req, res) => {
            const jobData = req.body;
            console.log(req.body);
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updateData = {
                $set: {
                    jobBanner: jobData.jobBanner,
                    companyLogo: jobData.companyLogo,
                    jobTitle: jobData.jobTitle,
                    jobCat: jobData.jobCat,
                    salaryRange: jobData.salaryRange,

                    jobPostingDate: jobData.startDate,
                    applicationDateLine: jobData.endDate,

                    jobResponsibilities1: jobData.jobResponsibilities1,
                    jobResponsibilities2: jobData.jobResponsibilities2,
                    jobResponsibilities3: jobData.jobResponsibilities3,
                    jobResponsibilities4: jobData.jobResponsibilities4,

                    eduRequirements1: jobData.eduRequirements1,
                    eduRequirements2: jobData.eduRequirements2,

                    expReq1: jobData.expReq1,
                    expReq2: jobData.expReq2,
                    expReq3: jobData.expReq3,

                    addReq1: jobData.addReq1,
                    addReq2: jobData.addReq2,
                    addReq3: jobData.addReq3,

                    jobLocation: jobData.jobLocation,

                    OtherBenefits1: jobData.OtherBenefits1,
                    OtherBenefits2: jobData.OtherBenefits2,
                    OtherBenefits3: jobData.OtherBenefits3,
                    OtherBenefits4: jobData.OtherBenefits4
                }
            }
            const result = await addedJobsCollection.updateOne(query, updateData, options);
            res.send(result);
        })

        app.delete("/addajob/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addedJobsCollection.deleteOne(query);
            res.send(result);
        })


        app.get("/applyjobs", verifyToken, async (req, res) => {
            const userEmail = req.query?.email;
            console.log("Received email:", userEmail);

            if (req.user?.email !== req.query.email) {
                return res.status(403).send({ message: "You have no permission to access! (Forbidden)" })
            }
            // Use dot notation to query the nested field userEmail within applications array
            let query = {};
            if (userEmail) {
                query = { "applications.userEmail": userEmail };
            }

            const result = await applyJobsCollection.find(query).toArray();
            res.send(result);
        });

        app.get("/applyjobs/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            // let query = {};
            // if (req.query?.email) {
            //     query = { email: req.query?.email }
            // }
            const result = await applyJobsCollection.find(filter).toArray();
            res.send(result);
        })

        app.post("/applyjobs", async (req, res) => {
            const data = req.body;

            const userEmail1 = req.query?.email;
            console.log("The Received email:", userEmail1);

            // Assuming userEmail is unique, you can use it as a query condition
            const jobId = data._id;
            const userName = data.userName;
            const userEmail = data.userEmail;
            const BioDataLink = data.BioDataLink;

            const jobTitle = data.jobTitle;
            const jobCat = data.jobCat;
            const salaryRange = data.salaryRange;
            const jobPostingDate = data.jobPostingDate;
            const applicationDateLine = data.applicationDateLine;
            // Generate a new ObjectId for the application
            const applicationId = new ObjectId();

            // Use $inc to increment applicantNumber by 1
            const update = {
                $inc: {
                    applicantNumber: 1,
                },

                $set: {
                    jobTitle: jobTitle,
                    jobCat: jobCat,
                    salaryRange: salaryRange,
                    jobPostingDate: jobPostingDate,
                    applicationDateLine: applicationDateLine
                },

                $push: {
                    applications: {
                        _id: applicationId,
                        userName: userName,
                        userEmail: userEmail,
                        BioDataLink: BioDataLink,
                    },
                },
            };

            // Use findOneAndUpdate to find the document based on the query and update it
            const query = { _id: new ObjectId(jobId) };
            const options = { upsert: true, returnDocument: 'after' };
            const result = await applyJobsCollection.findOneAndUpdate(query, update, options);
            const result1 = await addedJobsCollection.findOneAndUpdate(query, update, options);
            // const result2 = await applyJobsCollection.insertOne(data);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get("/", (req, res) => {
    res.send("JobGlebe server is running successfully")
})

app.listen(port, () => {
    console.log(`jobGlebe server is running here ${port}`)
})

