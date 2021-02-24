const express = require("express");
const moment = require("moment");

const router = express.Router();
const pool = require('../config/bd');


router.get("/", async (req, res) => {

    const today = new Date()

    try {
        // const { rows: tasks } = await pool.query('SELECT * FROM tasks ORDER BY index', [])
        // await pool.query('UPDATE tasks SET plan = $1, index = (SELECT count(id) FROM tasks WHERE plan = $4 and done = $3) WHERE date::date = $2 AND done = $3', ['today', today, false, 'today'])

        // const { rows: tasksToUpdate } = await pool.query('SELECT * FROM tasks WHERE date::date = $1 AND done = $2', [today, false])
        // const { rows: tasksToUpdate } = await pool.query('SELECT * FROM tasks WHERE date::date = $1 AND done = $2 AND plan != $3', [today, false, 'today'])
        // console.log("🚀 ~ file: tasks.js ~ line 15 ~ router.get ~ tasksToUpdate", tasksToUpdate)

        // for (let i = 0; i < tasksToUpdate.length; i++) {
        //     await pool.query('UPDATE tasks SET plan = $1, index = (SELECT count(id) FROM tasks WHERE plan = $1 and done = $4) + $2  WHERE id = $3', ['today', i, tasksToUpdate[0].id], false)
        // }


        // async function processArray(array) {
        //     for (let i = 0; i < tasksToUpdate.length; i++) {
        //         await pool.query('UPDATE tasks SET plan = $1, index = (SELECT count(id) FROM tasks WHERE plan = $5 and done = $4) + $2  WHERE id = $3', ['today', i, tasksToUpdate[0].id], false, 'today')
        //     }
        // }

        // processArray(tasksToUpdate)


        const { rows: tasks } = await pool.query('SELECT t1.*, t2.name as childname FROM tasks t1 LEFT JOIN tasks t2 ON t2.id = t1.child WHERE t1.done = $1 OR t1.donedate::date = $2 ORDER BY index', [false, today])
        const parentsIds = [...new Set(tasks.map(task => task.child))]
        const tasksWithParent = tasks.map(task => parentsIds.includes(task.id) ? {...task, isparent: true} : {...task, isparent: false})
        // const { rows: testtasks } = await pool.query('SELECT id FROM tasks WHERE date::date = $1',[today]) 
        // console.log("🚀 ~ file: tasks.js ~ line 15 ~ router.get ~ testtasks", testtasks)

        // const test = tasks.find(task => task.id === 160).date
        // console.log("🚀 ~ file: tasks.js ~ line 14 ~ router.get ~ test", test, today, 'dddd', test === today)

        res.send(tasksWithParent)
    } catch (error) {
        console.log(error)
    }
});

router.get("/done", async (req, res) => {

    const today = new Date()

    try {
        const { rows: tasks } = await pool.query('SELECT t1.*, t2.name as childname FROM tasks t1 LEFT JOIN tasks t2 ON t2.id = t1.child WHERE t1.done = $1 AND t1.donedate', [true, today])
        res.send(tasks)
    } catch (error) {
        console.log(error)
    }
});


router.post("/", async (req, res) => {

    const { name, type, balance, period, child, goal, plan, repeat, date, action, repeatday } = req.body;

    try {
        const response = await pool.query('SELECT count(id) FROM tasks WHERE done = false AND plan = $1', ['inbox'])
        const index = +response.rows[0].count
        const { rows: task } = await pool.query(
            'INSERT INTO tasks (name, type, balance, period, child, goal, plan, repeat, date, done, index, action, repeatday) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
            [name, type, balance, period, child, goal, plan, repeat, date, false, index, action, repeatday]
        )
        res.send(task[0])
    } catch (error) {
        console.log(error)
    }
});

router.put("/", async (req, res) => {

    const { name, type, balance, period, child, goal, plan, repeat, date, id, action, repeatday } = req.body;
    console.log("🚀 ~ file: tasks.js ~ line 80 ~ router.put ~ date", date)

    const dateOrNull = date ? date : null

    try {
        const resTask = await pool.query('SELECT plan, index FROM tasks WHERE id = $1', [id])

        if (resTask.rows[0].plan !== plan) {
            const response = await pool.query('SELECT count(id) FROM tasks WHERE done = false AND plan = $1', [plan])
            const index = +response.rows[0].count
            await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, plan = $7, repeat = $8, date = $9, index = $11, action = $12, repeatday = $13 WHERE id = $10',
                [name, type, balance, period, child, goal, plan, repeat, dateOrNull, id, index, action, repeatday])
            await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2', [resTask.rows[0].index, resTask.rows[0].plan])
        } else {
            const { rows: tasks } = await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, plan = $7, repeat = $8, date = $9, action = $11, repeatday = $12 WHERE id = $10',
                [name, type, balance, period, child, goal, plan, repeat, dateOrNull, id, action, repeatday])
        }


        // const { rows: tasks } = await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, plan = $7, repeat = $8, date = $9 WHERE id = $10',
        //     [name, type, balance, period, child, goal, plan, repeat, date, id])
        // res.send(tasks)
        res.send('ok')
    } catch (error) {
        console.log(error)
    }
});

router.put("/do", async (req, res) => {

    const { id } = req.body;

    const today = new Date()

    try {
        const { rows: task } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id])

        const index = task[0].index
        const plan = task[0].plan
        
        if (task[0].repeat) {

            // const newDate = new Date()                      
            // newDate.setDate(today.getDate() + task[0].repeatday);
            const newDate = moment(today).add(task[0].repeatday, 'days').format('YYYY-MM-DD')  

            await pool.query(
                'INSERT INTO tasks (name, type, balance, period, child, goal, plan, repeat, date, done, index, action, repeatday) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
                [task[0].name, task[0].type, task[0].balance, task[0].period, task[0].child, task[0].goal, 'upcoming', task[0].repeat, newDate, false, task[0].index, task[0].action, task[0].repeatday]
            )
        }
        const { rows: tasks } = await pool.query('UPDATE tasks SET done = $1, donedate = $3, plan = $4 WHERE id = $2', [true, id, today, 'done'])
        await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2', [index, plan])
        res.send('ok')
    } catch (error) {
        console.log(error)
    }
});


router.put("/reindex", async (req, res) => {

    const { plan, oldIndex, newIndex } = req.body;

    const oldIsLess = oldIndex < newIndex

    try {
        const task = await pool.query('SELECT id FROM tasks WHERE index = $1 and plan = $2 and done = $3', [oldIndex, plan, false])

        if (oldIsLess) {
            await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND index <= $2 AND plan = $3 AND done = $4', [oldIndex, newIndex, plan, false])
        } else {
            await pool.query('UPDATE tasks SET index = index + 1 WHERE index >= $1 AND index < $2 AND plan = $3 AND done = $4', [newIndex, oldIndex, plan, false])
        }

        await pool.query('UPDATE tasks SET index = $1 WHERE id = $2',
            [newIndex, task.rows[0].id])
        res.send('ok')
    } catch (error) {
        console.log(error)
    }
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const user = await pool.query("DELETE FROM tasks WHERE id = $1", [id])
        res.status(201).send('Ok');
    } catch (error) {
        console.log(error)
    }
});

module.exports = router;