import { Response } from 'express';

export const successResponse = (res: Response, data: any = null, message: string = 'Success', status: number = 200) => {
  return res.status(status).json({
    success: true,
    message,
    ... (data && { ...data })
  });
};

export const errorResponse = (res: Response, message: string = 'Error', status: number = 400) => {
  return res.status(status).json({
    success: false,
    error: message
  });
};


