import { startServer } from "../server";

const appPromise = startServer();

export default async function handler(req: any, res: any) {
    const app = await appPromise;
    return app(req, res);
}
