import { Request, Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { AuthRequest } from './auth.middleware';

export class ProxyMiddleware {
  static async forwardRequest(
    serviceUrl: string,
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Add user info to request body if authenticated
      const authReq = req as AuthRequest;
      const body = authReq.user ? {
        ...req.body,
        userId: authReq.user.id,
        userRole: authReq.user.role,
      } : req.body;

      const config: AxiosRequestConfig = {
        method: req.method as any,
        url: `${serviceUrl}${req.path}`,
        headers: {
          ...req.headers,
          host: new URL(serviceUrl).host,
          'x-user-id': authReq.user?.id || '',
          'x-user-role': authReq.user?.role || '',
          'x-user-email': authReq.user?.email || '',
        },
        params: req.query,
        data: body,
        validateStatus: () => true,
      };

      const response = await axios(config);

      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error('Proxy error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Service unavailable',
      });
    }
  }
}