const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const express = require('express')
const cors = require('cors');

require('dotenv').config();
const jwt = require('jsonwebtoken');

var nodemailer = require('nodemailer');
var sgTransport = require('nodemailer-sendgrid-transport');
// const { calculateObjectSize } = require('bson');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());



// Connection with SEND GRID 
var emailSender = {
    auth: {
        api_key: process.env.SEND_GRID_KEY
    }
}

var sendEmailClient = nodemailer.createTransport(sgTransport(emailSender));


// EMAIL SEND function 
function orderConfrimationEmail(booking) {
    const { email, name, productName, quantity, amount } = booking;

    var sendEmail = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: `Your ${productName} order is Confirmed`,
        text: `Your order for ${productName} is is Confirmed`,
        html: `
          <div>
            <h3> Hello ${name}, </h3>
            <h4>Your order for ${productName} is confirmed</h4>
            <p>Your order info: ${quantity} quantity of ${productName} and the cost of your order is $${amount}.</p>

            <p>Thanks for ordering.</p>
            
            <h3>Our Address</h3>
            <a href="https://goo.gl/maps/eKRNKkwYWAxURH8JA">Gulshan, Dhaka - 1212</a>
            <p>Bangladesh</p>
            <a href="https://web.programming-hero.com/">unsubscribe</a>
          </div>
        `
    };

    sendEmailClient.sendMail(sendEmail, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Message sent: ', info);
        }
    });

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.SECRET_KEY}@cluster0.mmwro.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// ----------------- Verify the JSON Web Token 
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
        const paymentCollection = client.db('manufacturer').collection('payments');



        // Verify the ADMIN 
        async function verifyAdmin(req, res, next) {
            const requesterEmail = req.decoded.email;
            const requesterProfile = await userCollection.findOne({ email: requesterEmail })
            if (requesterProfile.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'Forbidden access' });
            }
        }


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


        app.patch('/users/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            console.log(user.email)
            const filter = { email: email };

            const updateDoc = {
                $set: {
                    name: user.displayName,
                    email: user.email,
                    phone: user.phone,
                    job: user.job,
                    education: user.education,
                    degree: user.degree,
                    institution: user.institution,
                    batch: user.batch,
                    city: user.city,
                    address: user.address,
                    facebookLink: user.facebook,
                    instagram: user.instagram,
                    skill: user.instagram,
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)

        })


        // ---------------- Get admin ----------------
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })

        // ---------------- Update or Add user  ----------------
        app.put('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
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

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result)
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


        app.delete('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const cursor = await productCollection.deleteOne(query);
            res.send(cursor)
        });



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



        // Get Specific Order Details BY ID 
        app.get('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const orderId = { _id: ObjectId(id) };
            const cursor = await orderCollection.findOne(orderId);
            res.send(cursor)
        })


        // ---------------- Post single order  ----------------
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            orderConfrimationEmail(order)
            res.send({ success: true, result });
        })


        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const orderDetails = req.body;
            const filter = { _id: ObjectId(id) };
            const alreadyPaid = orderDetails.paid;
            if (alreadyPaid) {
                const updateDoc = {
                    $set: {
                        status: true,
                        status: orderDetails.status
                    }
                };
                const result = await orderCollection.updateOne(filter, updateDoc);
                res.send(result);
            }

            else {
                const paymentDetails = req.body;
                const updateDoc = {
                    $set: {
                        paid: true,
                        payment: paymentDetails.transactionId
                    }
                }
                const paymentResult = await paymentCollection.insertOne(paymentDetails);
                const result = await orderCollection.updateOne(filter, updateDoc);

                res.send(result)
            }
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



        /*
        ----------------- PAYMENT -----------------
       */
        // ---------------- Stripe Payment 
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.amount;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
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