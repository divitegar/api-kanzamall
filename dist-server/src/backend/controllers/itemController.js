import pool from '../config/db.js';
export const getItems = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const createItem = async (req, res) => {
    const { name, description } = req.body;
    if (!name)
        return res.status(400).json({ error: 'Name is required' });
    try {
        const [result] = await pool.query('INSERT INTO items (name, description) VALUES (?, ?)', [name, description]);
        const [newItem] = await pool.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
        res.status(201).json(newItem[0]);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM items WHERE id = ?', [id]);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
