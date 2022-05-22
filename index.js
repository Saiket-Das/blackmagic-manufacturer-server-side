const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.SECRET_KEY}@cluster0.mmwro.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const productCollection = client.db('manufacturer').collection('products');
        const orderCollection = client.db('manufacturer').collection('orders');


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
        // ---------------- Post single order  ----------------
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
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