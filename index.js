const express = require('express');
const app = express();
require('dotenv').config()


const tasks = require('./routes/tasks')


app.use(express.json());


app.use("/api/tasks", tasks);


app.listen(5002, () => {
    console.log('server start')
})


