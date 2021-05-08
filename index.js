const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()


const tasks = require('./routes/tasks')
const days = require('./routes/days')
const habits = require('./routes/habits')

app.use(cors());
app.use(express.json());


app.use("/api/tasks", tasks);
app.use("/api/days", days);
app.use("/api/habits", habits);


app.listen(5002, () => {
    console.log('server start 5002')
})


