const express = require("express");
const moment = require("moment");

const router = express.Router();
const pool = require('../config/bd');
const constants = require("../config/domain");


const addToNewPlan = async (task_id, oldPlan, newPlan, oldIndex) => {
    const changeOldPlan = await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2 AND done = $3', [oldIndex, oldPlan, false])
    const response = await pool.query('SELECT count(id) FROM tasks WHERE done = false AND plan = $1', [newPlan])
    const newIndex = +response.rows[0].count
    const changedTask = await pool.query('UPDATE tasks SET index = $1, plan = $2 WHERE id = $3', [newIndex, newPlan, task_id])    
}




router.get("/", async (req, res) => {
    const today = new Date()

    try {
        // const { rows: tasks } = await pool.query('SELECT * FROM tasks ORDER BY index', [])
        // await pool.query('UPDATE tasks SET plan = $1, index = (SELECT count(id) FROM tasks WHERE plan = $4 and done = $3) WHERE date::date = $2 AND done = $3', ['today', today, false, 'today'])

        // const { rows: tasksToUpdate } = await pool.query('SELECT * FROM tasks WHERE date::date = $1 AND done = $2', [today, false])
        // const { rows: tasksToUpdate } = await pool.query('SELECT * FROM tasks WHERE date::date = $1 AND done = $2 AND plan != $3', [today, false, 'today'])

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
        const tasksWithParent = tasks.map(task => parentsIds.includes(task.id) ? { ...task, isparent: true } : { ...task, isparent: false })
        // const { rows: testtasks } = await pool.query('SELECT id FROM tasks WHERE date::date = $1',[today]) 

        // const test = tasks.find(task => task.id === 160).date

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

router.get("/week", async (req, res) => {

    const lastWeek = moment(new Date()).format('W')

    try {
        const { rows: tasks } = await pool.query('SELECT *, EXTRACT ("week" FROM donedate) as week FROM tasks WHERE done = TRUE AND type = $2 AND EXTRACT ("week" FROM donedate) = $1', [lastWeek, 'задача'])
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

router.put("/replan", async (req, res) => {

    const { task_id, oldPlan, newPlan, oldIndex, newIndex } = req.body;

    const oldIsLess = oldIndex < newIndex

    try {
        if (newIndex) {
            if (oldPlan === newPlan) {
                if (oldIsLess) {
                    await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND index <= $2 AND plan = $3 AND done = $4', [oldIndex, newIndex, oldPlan, false])
                } else {
                    await pool.query('UPDATE tasks SET index = index + 1 WHERE index >= $1 AND index < $2 AND plan = $3 AND done = $4', [newIndex, oldIndex, oldPlan, false])
                }
                await pool.query('UPDATE tasks SET index = $1 WHERE id = $2', [newIndex, task_id])
            } else {
                await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2 AND done = $3', [oldIndex, oldPlan, false])
                await pool.query('UPDATE tasks SET index = index + 1 WHERE index >= $1 AND plan = $2 AND done = $3', [newIndex, newPlan, false])
                await pool.query('UPDATE tasks SET index = $1, plan = $2 WHERE id = $3', [newIndex, newPlan, task_id])
            }
        } else {
            await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2 AND done = $3', [oldIndex, oldPlan, false])
            const response = await pool.query('SELECT count(id) FROM tasks WHERE done = false AND plan = $1', [newPlan])
            const newCountIndex = +response.rows[0].count
            await pool.query('UPDATE tasks SET index = $1 WHERE id = $2', [newCountIndex, task_id]) 
        }


        // const task = await pool.query('SELECT id FROM tasks WHERE index = $1 and plan = $2 and done = $3', [oldIndex, plan, false])

        // if (oldIsLess) {
        //     await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND index <= $2 AND plan = $3 AND done = $4', [oldIndex, newIndex, plan, false])
        // } else {
        //     await pool.query('UPDATE tasks SET index = index + 1 WHERE index >= $1 AND index < $2 AND plan = $3 AND done = $4', [newIndex, oldIndex, plan, false])
        // }

        // await pool.query('UPDATE tasks SET index = $1 WHERE id = $2',
        //     [newIndex, task.rows[0].id])
        res.send('ok')
    } catch (error) {
        console.log(error)
    }
});

router.put("/", async (req, res) => {

    const { name, type, balance, period, child, goal, plan, repeat, date, id, action, repeatday } = req.body;

    const dateOrNull = date ? date : null
    console.log("🚀 ~ file: tasks.js ~ line 136 ~ router.put ~ dateOrNull", dateOrNull)

    try {
        const resTask = await pool.query('SELECT plan, index FROM tasks WHERE id = $1', [id])
        const oldPlan = resTask.rows[0].plan
        const oldIndex = resTask.rows[0].index

        const isPlanWasChanged = oldPlan !== plan

        if (isPlanWasChanged) {
            await addToNewPlan(id, oldPlan, plan, oldIndex)
        }
        const updatedTask = await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, repeat = $7, date = $8, action = $9, repeatday = $10 WHERE id = $11',
            [name, type, balance, period, child, goal, repeat, dateOrNull, action, repeatday, id])
        // const isTodayWasChanged = planBefore === 'today' || plan === 'today'

        // const deleteFromToday = planBefore === constants.plan.today && plan !== constants.plan.today
        // const addToToday = planBefore !== constants.plan.today && plan === constants.plan.today




        // if (deleteFromToday) {
        //     await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2', [indexBefore, constants.plan.today])
        // }

        // if (addToToday) {
        //     const response = await pool.query('SELECT count(id) FROM tasks WHERE done = false AND plan = $1', [constants.plan.today])
        //     const newIndex = +response.rows[0].count
        //     await pool.query('UPDATE tasks SET index = $1 WHERE id = $2', [newIndex, id])
        // }

        // const updatedTask = await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, plan = $7, repeat = $8, date = $9, index = $10, action = $11, repeatday = $12 WHERE id = $10',
        //     [name, type, balance, period, child, goal, plan, repeat, dateOrNull, id, action, repeatday])
        // if (isPlanWasChanged) {
        //     const response = await pool.query('SELECT count(id) FROM tasks WHERE done = false AND plan = $1', [plan])
        //     const index = +response.rows[0].count
        //     await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, plan = $7, repeat = $8, date = $9, index = $11, action = $12, repeatday = $13 WHERE id = $10',
        //         [name, type, balance, period, child, goal, plan, repeat, dateOrNull, id, index, action, repeatday])
        //     await pool.query('UPDATE tasks SET index = index - 1 WHERE index > $1 AND plan = $2', [resTask.rows[0].index, resTask.rows[0].plan])
        // } else {
        //     const { rows: tasks } = await pool.query('UPDATE tasks SET name = $1, type = $2, balance = $3, period = $4, child = $5, goal = $6, plan = $7, repeat = $8, date = $9, action = $11, repeatday = $12 WHERE id = $10',
        //         [name, type, balance, period, child, goal, plan, repeat, dateOrNull, id, action, repeatday])
        // }


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
    console.log('reindex')
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