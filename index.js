const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.SECRET_KEY}@cluster0.mmwro.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// Verify the JSON Web Token 
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next()
    });


}


async function run() {
    try {
        await client.connect();
        const productCollection = client.db('manufacturer').collection('products');
        const orderCollection = client.db('manufacturer').collection('orders');
        const reviewCollection = client.db('manufacturer').collection('reviews');
        const userCollection = client.db('manufacturer').collection('users');




        /*
        ----------------- USER -----------------
        */

        // ---------------- Get all users  ----------------
        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })

        // ---------------- Update or Add user  ----------------
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.JWT_TOKEN, { expiresIn: '1d' })
            res.send({ result, token });
        });


        /*
        ----------------- PRODUCTS -----------------
        */
        // ---------------- Get all the products  ----------------
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = await productCollection.find(query).toArray();
            res.send(cursor)
        });


        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product)
        })

        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const details = req.body;
            const updatedStock = details.stock;
            const updateDoc = {
                $set: {
                    stock: updatedStock
                }
            }
            const result = await productCollection.updateOne(query, updateDoc);
            res.send(result)
        })




        /*
        ----------------- ORDERS -----------------
        */
        // ---------------- Get single user orders byt using email query  ----------------
        app.get('/orders', verifyJWT, async (req, res) => {

            const query = {};

            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email) {
                if (email === decodedEmail) {
                    const query = { email: email }
                    const result = await orderCollection.find(query).toArray();
                    res.send(result);
                }
                else {
                    return res.status(403).send({ message: 'Forbidden access' });

                }
            }


            else if (!email) {
                const cursor = await orderCollection.find(query).toArray();
                res.send(cursor);
            }
        })

        // ---------------- Post single order  ----------------
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send({ success: true, result });
        })


        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })




        /*
        ----------------- REVIEWS -----------------
       */
        // ---------------- Get single user reviews byt using email query  ----------------
        app.get('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.find(review).toArray();
            res.send(result);
        })

        // ---------------- Post single review  ----------------
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send({ success: true, result });
        })

    }

    catch {

    }
}
run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Manufacturer Blackmagic!')
})

app.listen(port, () => {
    console.log(`Manufacturer Blackmagic running ${port}`)
})