import { DocumentStore, IDocumentSession } from 'ravendb';
import { RavenConfig } from './types';

class RavenDbClient {
  private store: DocumentStore;

  constructor(config: RavenConfig) {
    this.store = new DocumentStore(config.urls, config.database);
    if (config.certificate) {
      this.store.authOptions = config.certificate;
    }

    this.store.initialize();
  }

  openSession(): IDocumentSession {
    return this.store.openSession();
  }

  dispose(): void {
    this.store.dispose();
  }
}

export default RavenDbClient;
