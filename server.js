const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRadians = degree => degree * (Math.PI / 180);
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}


app.post('/addSchool', async (req, res) => {
    // 1. Validation Schema
    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        address: Joi.string().min(5).required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const { name, address, latitude, longitude } = req.body;
        const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(query, [name, address, latitude, longitude]);
        
        res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error occurred while adding the school.' });
    }
});


app.get('/listSchools', async (req, res) => {
    const userLat = parseFloat(req.query.latitude);
    const userLon = parseFloat(req.query.longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: 'Please provide valid latitude and longitude in query parameters.' });
    }

    try {
        const [schools] = await db.execute('SELECT * FROM schools');

        const sortedSchools = schools.map(school => {
            const distance = calculateDistance(userLat, userLon, school.latitude, school.longitude);
            return { ...school, distance: parseFloat(distance.toFixed(2)) }; // Append distance in km
        }).sort((a, b) => a.distance - b.distance); // Sort ascending by distance

        res.status(200).json(sortedSchools);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error occurred while fetching schools.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});