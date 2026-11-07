import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, ok, badRequest, notFound, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';

const USERS_TABLE = process.env.USERS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.id;
    if (!userId) return notFound('Usuario no encontrado');

    // quién llama viene del authorizer del Gateway
    const auth = getAuth(event);
    if (!auth) return unauthorized();
    const callerId = auth.userId;
    if (callerId !== userId) {
      return badRequest('Solo puedes actualizar tu propio usuario');
    }

    const body = JSON.parse(event.body || '{}');
    const name = body.name;
    if (!name) return badRequest('El nombre es requerido');

    const existing = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );
    if (!existing.Item) return notFound('Usuario no encontrado');

    const now = new Date().toISOString();
    await dynamo.send(
      new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId },
        // "name" es palabra reservada de DynamoDB: se usa #name
        UpdateExpression: 'SET #name = :name, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#name': 'name' },
        ExpressionAttributeValues: { ':name': name, ':updatedAt': now },
      })
    );

    return ok({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error en update user', error);
    return internalError();
  }
}

export const updateUser = withCors(handler);
