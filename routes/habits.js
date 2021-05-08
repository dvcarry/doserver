const express = require("express");
const moment = require("moment");

const router = express.Router();
const pool = require('../config/bd');


const today = new Date()


router.get("/total", async (req, res) => {

    const today = moment(new Date())
    const DAYFORHABIT = 30

    try {
        const { rows: lastItems } = await pool.query("SELECT DISTINCT ON (habit_id, value) habits_history.*, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value ORDER BY habit_id, value, date DESC", [])
        const { rows: firstItems } = await pool.query("SELECT DISTINCT ON (habit_id, value) habits_history.*, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value ORDER BY habit_id, value, date ASC", [])
        const { rows: allHistory } = await pool.query("SELECT * FROM habits_history")
        const habitsWithDif = firstItems.map(item => {

            const days = today.diff(moment(item.date), 'days')
            const minimumDay = days > DAYFORHABIT ? days : DAYFORHABIT
            const done = allHistory.filter(historyItem => historyItem.value === item.value).length
            const percent = Math.round(done / minimumDay * 100)

            return {
                name: item.name,
                percent
            }
        })
        const sortedData = habitsWithDif.sort((a,b) => a.percent - b.percent)
        res.status(201).send(sortedData);

    } catch (error) {
        console.log(error)
    }
});


router.get("/:date", async (req, res) => {

    const { date } = req.params;
    // const today = moment(new Date()).format('YYYY-MM-DD')
    const todayMoment = moment(new Date())

    try {
        const { rows: habits } = await pool.query("SELECT * FROM habits WHERE active = TRUE", [])

        const { rows: habits_values } = await pool.query("SELECT id, name, habit_id FROM habits_values", [])
        const { rows: habits_history } = await pool.query("SELECT habits_history.id, habits_history.habit_id, habits_history.value, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value WHERE date = $1", [date])

        const { rows: categoryRes } = await pool.query("SELECT DISTINCT category FROM habits", [])
        const categories = categoryRes.map(item => item.category)

        const habitsWithHistory = habits.map(habit => {
            const historyForHabit = habits_history
                .filter(item => item.habit_id === habit.id)
                // .map(item => ({ id: item.id, value: item.value, name: item.name }))
                .map(item => item.name)

            return {
                ...habit,
                value: historyForHabit
            }
        })

        const { rows: historyRes } = await pool.query("SELECT habits_history.*, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value", [])


        const { rows: lastSeparateItems } = await pool.query("SELECT DISTINCT ON (habit_id, value) habits_history.*, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value LEFT JOIN habits ON habits.id = habits_history.habit_id WHERE habits.scoretype = 'separate' AND habits.active = TRUE ORDER BY habit_id, value, date DESC", [])
        const { rows: lastCommonItems } = await pool.query("SELECT DISTINCT ON (habit_id) habits_history.*, habits.name FROM habits_history LEFT JOIN habits ON habits.id = habits_history.habit_id WHERE habits.scoretype = 'common' AND habits.active = TRUE ORDER BY habit_id, date DESC", [])

        const score = [...lastSeparateItems, ...lastCommonItems]

            .map(item => ({ id: item.id, name: item.name, days: todayMoment.diff(item.date, 'days'), total: historyRes.filter(historyItem => historyItem.value === item.value).length }))
            .filter(item => item.days !== 0)
            .sort((a, b) => b.days - a.days)


        const dates = []

        let i = 29;
        while (i >= 0) {
            const newDate =  moment(today).subtract(i,'d').format('DD-MM');
            dates.push(newDate)
            i--;
        }


        const historyWithDateIndex = historyRes.map(item => ({...item, dayindex: 30 - moment(today).diff(moment(item.date), 'days')}))
        const historyTotal = habits_values.map(item => {
            return {
                id: item.id,
                name: item.name,
                history: historyWithDateIndex.filter(historyItem => historyItem.value === item.id)
            }
        })

        const history = {dates, historyTotal}


        const data = {
            habits: habitsWithHistory,
            value: habits_values,
            score,
            categories,
            history
        }


        res.status(201).send(data);
    } catch (error) {
        console.log(error)
    }
});

router.get("/score", async (req, res) => {

    const today = moment(new Date())

    try {
        const { rows: lastItems } = await pool.query("SELECT DISTINCT ON (habit_id, value) habits_history.*, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value ORDER BY habit_id, value, date DESC", [])
        const { rows: lastSeparateItems } = await pool.query("SELECT DISTINCT ON (habit_id, value) habits_history.*, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value LEFT JOIN habits ON habits.id = habits_history.habit_id WHERE habits.scoretype = 'separate' ORDER BY habit_id, value, date DESC", [])
        const { rows: lastCommonItems } = await pool.query("SELECT DISTINCT ON (habit_id) habits_history.*, habits.name FROM habits_history LEFT JOIN habits ON habits.id = habits_history.habit_id WHERE habits.scoretype = 'common' ORDER BY habit_id, value, date DESC", [])
        const difArray = lastItems.map(item => ({ ...item, days: today.diff(item.date, 'days') }))
        res.status(201).send(difArray);
    } catch (error) {
        console.log(error)
    }
});







router.post("/history", async (req, res) => {

    const { habit_id, value, date } = req.body;

    try {
        const { rows: habits_history } = await pool.query("SELECT id, habit_id, value FROM habits_history WHERE date = $1 and habit_id = $2", [date, habit_id])
        console.log("🚀 ~ file: habits.js ~ line 49 ~ router.post ~ habits_history", habits_history)
        const isMulti = Array.isArray(value)

        if (isMulti) {
            const isAddHistory = value.length > habits_history.length
            if (isAddHistory) {
                const addItem = value[value.length - 1]
                const newItem = await pool.query("SELECT id FROM habits_values WHERE habit_id = $1 AND name = $2", [habit_id, addItem])
                await pool.query("INSERT INTO habits_history (habit_id, value, date) VALUES($1,$2,$3) RETURNING *", [habit_id, newItem.rows[0].id, date])
            } else {
                const deleteItem = habits_history.filter(item => !value.includes(item.value));
                await pool.query("DELETE FROM habits_history WHERE id = $1", [deleteItem[0].id]);
            }
        } else {

            const { rows: newItem } = await pool.query("SELECT id FROM habits_values WHERE habit_id = $1 AND name = $2", [habit_id, value])
            const isExist = habits_history.length === 1
            if (isExist) {
                await pool.query("UPDATE habits_history SET value = $1 WHERE id = $2", [newItem[0].id, habits_history[0].id])
            } else {
                await pool.query("INSERT INTO habits_history (habit_id, value, date) VALUES($1,$2,$3) RETURNING *", [habit_id, newItem[0].id, date])
            }
        }
        const { rows: response } = await pool.query("SELECT habits_history.id, habits_history.habit_id, habits_history.value, habits_values.name FROM habits_history LEFT JOIN habits_values ON habits_values.id = habits_history.value WHERE date = $1", [date])

        // const { rows: response } = await pool.query("SELECT id, habit_id, value FROM habits_history WHERE date = $1", [date])       
        res.status(201).send(response);

    } catch (error) {
        console.log(error)
    }
});

router.delete("/history/:habit_id/:date", async (req, res) => {

    const { habit_id, date } = req.params;
    console.log("🚀 ~ file: habits.js ~ line 86 ~ router.delete ~ habit_id", habit_id)

    try {
        const { rows: item } = await pool.query("SELECT id FROM habits_values WHERE habit_id = $1", [habit_id])
        await pool.query("DELETE FROM habits_history WHERE habit_id = $1 AND date = $2", [item[0].id, date])
        res.status(201).send('Ok');
    } catch (error) {
        console.log(error)
    }
});


module.exports = router;