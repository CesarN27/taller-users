import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { dynamo } from '../lib/dynamodb';
import { badRequest, ok, unauthorized, internalError } from '../lib/response';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt';
import { withCors } from '../common/cors';

const USERS_TABLE = process.env.USERS_TABLE as string;
const REFRESH_TOKENS_TABLE = process.env.REFRESH_TOKENS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const email = body.email;
    const password = body.password;

    if (!email || !password) {
      return badRequest('email y password son requeridos');
    }

    // buscar al usuario por correo
    const result = await dynamo.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      })
    );
    const user = result.Items?.[0];
    if (!user) return unauthorized('Credenciales inválidas');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return unauthorized('Credenciales inválidas');

    const payload = { userId: user.userId, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // el refresh token se guarda 7 días; el TTL de DynamoDB espera SEGUNDOS
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await dynamo.send(
      new PutCommand({
        TableName: REFRESH_TOKENS_TABLE,
        Item: { token: refreshToken, userId: user.userId, expiresAt },
      })
    );

    return ok({ accessToken, refreshToken });
  } catch (error) {
    console.error('Login error', error);
    return internalError();
  }
}

export const login = withCors(handler);
