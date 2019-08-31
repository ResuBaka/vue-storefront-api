import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import initializeDb from './db';
import middleware from './middleware';
import { loadAdditionalCertificates } from './helpers/loadAdditionalCertificates'
import api from './api';
import config from 'config';
import img from './api/img';
import invalidateCache from './api/invalidate'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/schema';
import * as path from 'path'
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

const expressApp = express();

// logger
expressApp.use(morgan('dev'));

expressApp.use('/media', express.static(path.join(__dirname, config.get(`${config.get('platform')}.assetPath`))))

// 3rd party middleware
expressApp.use(cors({
  exposedHeaders: config.get('corsHeaders')
}));

expressApp.use(bodyParser.json({
  limit: config.get('bodyLimit')
}));

loadAdditionalCertificates()

// graphQl Server part
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

expressApp.use(bodyParser.urlencoded({ extended: true }));
expressApp.use(bodyParser.json());

expressApp.use('/graphql', graphqlExpress(req => ({
  schema,
  context: { req: req },
  rootValue: global
})));

expressApp.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

// connect to db
initializeDb(async db => {
  // internal middleware
  expressApp.use(middleware({ config, db }));

  // api router
  expressApp.use('/api', api({ config, db }));
  expressApp.use('/img', img({ config, db }));
  expressApp.use('/img/:width/:height/:action/:image', (req, res, next) => {
    console.log(req.params)
  });
  expressApp.post('/invalidate', invalidateCache)
  expressApp.get('/invalidate', invalidateCache)
  const port = process.env.PORT || config.get('server.port')
  const host = process.env.HOST || config.get('server.host')

  // @ts-ignore
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(expressApp));
  await app.listen(parseInt(port + 1), host, () => {
    console.log(`Vue Storefront API started at http://${host}:${port}`);
  });
});
