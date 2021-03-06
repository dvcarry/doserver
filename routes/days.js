const express = require("express");
const moment = require("moment");

const router = express.Router();
const pool = require('../config/bd');




router.get("/", async (req, res) => {

    const today = moment(new Date()).format('YYYY-MM-DD') 

    try {
        const {rows: day} = await pool.query("SELECT FROM days WHERE date = $1", [today])
        const isplan = day.length > 0 ? true : false
        res.status(201).send(isplan);
    } catch (error) {
        console.log(error)
    }
});

router.post("/", async (req, res) => {

    const today = moment(new Date()).format('YYYY-MM-DD') 

    try {
        const {rows: day} = await pool.query("INSERT INTO days (date, isplan) VALUES($1,$2) RETURNING *", [today, true])
        res.status(201).send(day[0]);
    } catch (error) {
        console.log(error)
    }
});

module.exports = router;