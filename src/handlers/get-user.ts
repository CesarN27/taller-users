import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, ok, notFound, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';

const USERS_TABLE = process.env.USERS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const auth = getAuth(event);
    if (!auth) return unauthorized();

    const userId = event.pathParameters?.id;
    if (!userId) return notFound('El ID es necesario');

    const result = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );
    if (!result.Item) return notFound('Usuario no encontrado');

    const { password, ...userPublic } = result.Item;
    return ok({ user: userPublic });
  } catch (error) {
    console.error('Error en get user', error);
    return internalError();
  }
}

export const getUser = withCors(handler);
