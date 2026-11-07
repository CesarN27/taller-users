import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dynamo } from '../lib/dynamodb';
import { badRequest, ok, internalError } from '../lib/response';
import { withCors } from '../common/cors';
import { User } from '../types/user';

const USERS_TABLE = process.env.USERS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const { email, password, name, role } = JSON.parse(event.body || '{}');

    if (!email || !password || !name || !role) {
      return badRequest('email, password, name y role son requeridos');
    }
    if (role !== 'buyer' && role !== 'seller') {
      return badRequest('role debe ser buyer o seller');
    }

    // correo único: se busca en el índice por email
    const existing = await dynamo.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
      })
    );
    if (existing.Items && existing.Items.length > 0) {
      return badRequest('El email ya se encuentra registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const user: User = {
      userId: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: now,
      updatedAt: now,
    };

    await dynamo.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));

    // nunca regreses la contraseña
    const { password: _omit, ...userPublic } = user;
    return ok(userPublic);
  } catch (error) {
    console.error('Error al registrar el usuario', error);
    return internalError('Error al registrar el usuario');
  }
}

export const register = withCors(handler);
