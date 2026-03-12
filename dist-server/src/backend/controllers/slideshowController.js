import pool from '../config/db.js';
import { successResponse, errorResponse } from '../helpers/apiResponse.js';
export const getSlideshows = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM sw_slideshow WHERE published = "1"');
        return successResponse(res, { slideshows: rows }, 'Slideshows retrieved successfully');
    }
    catch (error) {
        return errorResponse(res, error.message, 500);
    }
};
