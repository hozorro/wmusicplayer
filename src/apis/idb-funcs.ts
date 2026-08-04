export class indexedDbHelper { 
  private config: IDBConfig;
  private db: IDBDatabase | null = null;
  private deferredDb: Promise<IDBDatabase> | null = null;

  constructor(config: IDBConfig) { 
    this.config = config;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => { 
      const { name:dbName, version, stores } = this.config;
      const request = indexedDB.open(dbName, version);

      request.onerror = () => { 
        console.error(`[IndexedDB] Failed to open idb：${request.error?.message}`);
        reject(request.error);
      };

      request.onsuccess = () => { 
        if(typeof this.config.init === 'function') {
          this.config.init();
        }
        resolve(request.result);
      };

      request.onupgradeneeded = () => { 
        const db = request.result;

        stores.forEach(store => { 
          if(db.objectStoreNames.contains(store.name)) {
            if(store.isClear) {
              db.deleteObjectStore(store.name);
              const objStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
              for(let i = 0; i < store.indexes.length; i++) {
                objStore.createIndex(store.indexes[i].name, store.indexes[i].keyPath, store.indexes[i].options);
              }
            }
          } else {
            const objStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
            for(let i = 0; i < store.indexes.length; i++) {
              objStore.createIndex(store.indexes[i].name, store.indexes[i].keyPath, store.indexes[i].options);
            }
          }
        })
      };
    });
  }

  async getDb(): Promise<IDBDatabase> { 
    if(this.db) return this.db;

    if(this.deferredDb) {
      return this.deferredDb;
    }

    this.deferredDb = this.openDb();

    try {
      this.db = await this.deferredDb;
      return this.db;
    } catch(e) {
      this.deferredDb = null;
      throw e;
    }
  }

  closeDb(): void {
    if(this.db) {
      this.db.close();
      this.db = null;
      this.deferredDb = null;
      console.log(`[IndexedDB] idb "${this.config.name}" connection closed`);
    }
  }

  static deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Request blocked！Restart the app to retry.'));
    });
  }

  async begin_transaction(storeName: string | string[], mode: IDBTransactionMode = 'readwrite') { 
    const db = await this.getDb()
    return new Promise<IDBTransaction>((resolve, reject) => { 
      const tx = db.transaction(storeName, mode);
      tx.onerror = () => {
        console.log(`[IndexedDB] ${storeName} transaction error: ${tx.error?.message}`);
        reject(tx.error);
      }
      resolve(tx);
      tx.oncomplete = () => { 
        console.log(`[IndexedDB] ${storeName} transaction completed.`)
      };
    });
  }

  add(storeName: string, data: any, transaction?: IDBTransaction) {
    return new Promise((resolve, reject) => { 
      const _add = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).add(data);
        req.onsuccess = () => { 
          resolve(req.result);
        }
        req.onerror = () => { 
          reject(req.error);
        }
      }
      transaction ? _add(transaction) : this.begin_transaction(storeName).then(tx => _add(tx));
    });
  }

  addMany(storeName: string, data: any[], transaction?: IDBTransaction) {
    return new Promise((resolve, reject) => { 
      const _add = (tx: IDBTransaction) => { 
        const objStore = tx.objectStore(storeName);
        try {
          data.forEach(item => objStore.add(item));
          resolve(true);
        } catch (error) {
          reject(error);
        }
      }
      transaction ? _add(transaction) : this.begin_transaction(storeName).then(tx => _add(tx));
    });
  }
  update<T extends Record<string,any>>(storeName: string, key: IDBValidKey, data: Partial<T>, upsert: boolean = false, transaction?: IDBTransaction) {
    return new Promise((resolve, reject) => { 
      const _update = (tx: IDBTransaction) => { 
        const getReq = tx.objectStore(storeName).get(key);
        getReq.onsuccess = () => { 
          const record = getReq.result;
          if(!record && !upsert) {
            reject(new Error(`No record found in store "${storeName}" with key "${key}"`));
            return;
          }
          const updatedRecord = { ...record, ...data };
          const putReq = tx.objectStore(storeName).put(updatedRecord);
          putReq.onsuccess = () => resolve(putReq.result);
          putReq.onerror = () => reject(putReq.error);
        }
        getReq.onerror = () => reject(getReq.error);
      }
      transaction ? _update(transaction) : this.begin_transaction(storeName).then(tx => _update(tx));
    });
  }
  upsert<T extends Record<string, any>>(storeName: string, data: T, transaction?: IDBTransaction): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => { 
      const _upsert = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
      transaction ? _upsert(transaction) : this.begin_transaction(storeName).then(tx => _upsert(tx));
    });
  }
  upsertMany<T extends Record<string,any>>(storeName: string, data: ({id: T['id']} & Partial<Omit<T, 'id'>>)[], transaction?: IDBTransaction) {
    return new Promise((resolve, reject) => { 
      const _upsert = (tx: IDBTransaction) => { 
        const promises = data.map(item => this.update(storeName, item.id, item, true, tx))
        Promise.all(promises).then(() => resolve(true)).catch(reject)
      }
      transaction ? _upsert(transaction) : this.begin_transaction(storeName).then(tx => _upsert(tx));
    });
  }
  delete(storeName: string, key: any, transaction?: IDBTransaction) { 
    return new Promise((resolve, reject) => { 
      const _delete = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).delete(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
      transaction ? _delete(transaction) : this.begin_transaction(storeName).then(tx => _delete(tx));
    })
  }
  deleteMany(storeName: string, keys: any[], transaction?: IDBTransaction) { 
    return new Promise((resolve, reject) => { 
      const _delete = (tx: IDBTransaction) => { 
        const promises = keys.map(key => this.delete(storeName, key, tx))
        Promise.all(promises).then(() => resolve(true)).catch(reject)
      }
      transaction ? _delete(transaction) : this.begin_transaction(storeName).then(tx => _delete(tx));
    })
  }
  clear(storeName: string, transaction?: IDBTransaction) {
    return new Promise((resolve, reject) => { 
      const _clear = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).clear();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
      transaction ? _clear(transaction) : this.begin_transaction(storeName).then(tx => _clear(tx));
    })
  }
  get<T>(storeName: string, key: any, transaction?: IDBTransaction): Promise<T> {
    return new Promise((resolve, reject) => { 
      const _get = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
      transaction ? _get(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _get(tx))
    })
  }
  getAll<T>(storeName: string, descending?: boolean, transaction?: IDBTransaction): Promise<T[]> {
    return new Promise((resolve, reject) => { 
      const _getAll = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).openCursor(null, descending ? 'prev' : 'next');
        const result: T[] = [];
        req.onsuccess = () => { 
          const cursor = req.result;
          if(cursor) {
            result.push(cursor.value);
            cursor.continue();
          } else resolve(result);
        }
        req.onerror = () => reject(req.error);
      }
      transaction ? _getAll(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getAll(tx));
    })
  }
  getIndexedAll<T>(storeName: string, indexName: string, key: any, transaction?: IDBTransaction): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => { 
      const _getIndexedAll = (tx: IDBTransaction) => { 
        let req = tx.objectStore(storeName).index(indexName).getAll(IDBKeyRange.only(key));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      };
      transaction ? _getIndexedAll(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexedAll(tx));
    })
  }
  getIndexedOfBoolean<T>(storeName: string, indexName: string, transaction?: IDBTransaction): Promise<T[]> { 
    return new Promise<T[]>((resolve, reject) => { 
      const _getIndexedOfBoolean = (tx: IDBTransaction) => { 
        let result: T[] = [];
        let req = tx.objectStore(storeName).index(indexName).openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if(cursor) { 
            result.push(cursor.value);
            cursor.continue();
          } else resolve(result);
        }
        req.onerror = () => reject(req.error);
      }
      transaction ? _getIndexedOfBoolean(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexedOfBoolean(tx));
    })
  }
  getIndexedPaginated<T extends (IDBAlbum | IDBArtist | IDBGenre | IDBTrack)>(storeName: string, indexName: string, rangeKeyName: keyof T, range: IDBKeyRange, pageSize: number, transaction?: IDBTransaction) {
    return new Promise<{tracks: T[], nextKey: T[keyof T] | null}>((resolve, reject) => { 
      const _getIndexedPaginated = (tx: IDBTransaction) => { 
        // console.log('[IndexedDB] paginated query:', {storeName, indexName, rangeKeyName, range, pageSize})
        const tracks: T[] = [];
        const req = tx.objectStore(storeName).index(indexName).openCursor(range, 'next');
        // console.log('[IndexedDB] paginated query cursor:', req)
        req.onsuccess = (event) => { 
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if(cursor && tracks.length < pageSize) {
            tracks.push(cursor.value)
            cursor.continue()
          } else {
            const nextKey = tracks.length > 0 ? tracks[tracks.length - 1][rangeKeyName] : null;
            resolve({tracks, nextKey});
          }
        }
        req.onerror = () => reject(req.error);
      }
      transaction ? _getIndexedPaginated(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexedPaginated(tx));
    })
  }
  getIndexedIn<T>(storeName: string, indexName: string, values: (string | number)[], transaction?: IDBTransaction): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const _getIndexedIn = (tx: IDBTransaction) => {
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const promises = values.map(value => {
          return new Promise<T[]>((resolve, reject) => {
            const range = IDBKeyRange.only(value);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          })
        })
        Promise.all(promises).then((results) => {
          resolve(results.flat())
        }).catch((error) => reject(error))
      }
      transaction ? _getIndexedIn(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexedIn(tx));
    })
  }
  getIndexedRange<T>(storeName: string, indexName: string, range: IDBKeyRange | null, descend: boolean = false, limit: number = 0, transaction?: IDBTransaction): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => { 
      const _getIndexedRange = (tx: IDBTransaction) => { 
        const results: T[] = [];
        const req = tx.objectStore(storeName).index(indexName).openCursor(range, descend ? 'prev' : 'next');
        req.onsuccess = () => { 
          const cursor = req.result;
          if(cursor) {
            results.push(cursor.value);
            if(limit > 0 && results.length >= limit) resolve(results);
            else cursor.continue();
          } else resolve(results);
        }
        req.onerror = () => reject(req.error);
      }
      transaction ? _getIndexedRange(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexedRange(tx));
    })
  }
  getCount(storeName: string, indexName?: string, range?: IDBKeyRange, transaction?: IDBTransaction): Promise<number> {
    return new Promise<number>((resolve, reject) => { 
      const _getCount = (tx: IDBTransaction) => { 
        let req: IDBRequest;
        if(indexName) { 
          req = tx.objectStore(storeName).index(indexName).count(range);
        } else { 
          req = tx.objectStore(storeName).count(range);
        }
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }
      transaction ? _getCount(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getCount(tx))
    })
  }
  getIndexDistinct<T>(storeName: string, indexName: string, transaction?: IDBTransaction): Promise<T[]> { 
    return new Promise<T[]>((resolve, reject) => { 
      const _getIndexDistinct = (tx: IDBTransaction) => { 
        const req = tx.objectStore(storeName).index(indexName).openKeyCursor(null, 'nextunique')
        const result: T[] = [];
        req.onsuccess = () => { 
          const cursor = req.result;
          if(cursor) {
            result.push(cursor.key as T);
            cursor.continue();
          } else resolve(result);
        }
        req.onerror = () => reject(req.error);
      }
      transaction ? _getIndexDistinct(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexDistinct(tx));
    })
  }
  getRandom<T>(storeName: string, count: number, indexName?: string, range?: IDBKeyRange, transaction?: IDBTransaction): Promise<T[]> { 
    return new Promise<T[]>((resolve, reject) => { 
      const _getIndexRandom = (tx: IDBTransaction) => { 
        const objStore = tx.objectStore(storeName);
        const source = indexName ? objStore.index(indexName) : objStore;
        const reservoir: T[] = [];
        let seen = 0;
        const req = source.openCursor(range || null);
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) { 
            seen++;
            if(reservoir.length < count) {
              reservoir.push(cursor.value);
            } else {
              const randIndex = Math.floor(Math.random() * seen);
              if(randIndex < count) {
                reservoir[randIndex] = cursor.value;
              }
            }
            cursor.continue();
          } else resolve(reservoir);
        }
        req.onerror = () => reject(req.error);
      };
      transaction ? _getIndexRandom(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _getIndexRandom(tx));
    })
  }
  search<T extends (IDBTrack | IDBArtist | IDBAlbum)>(
    storeName: 'track' | 'artist' | 'album', 
    indexName: string, 
    rangeKeyName: keyof T, 
    range: IDBKeyRange, 
    kw: string, 
    page: number,
    pageSize: number, 
    transaction?: IDBTransaction
  ): Promise<{total: number, data: T[], nextKey?: T[keyof T] | null}> {
    return new Promise((resolve, reject) => { 
      const _search = (tx: IDBTransaction) => { 
        const lowerKw = kw.toLowerCase();
        const result: T[] = [];
        let total = (page - 1) * pageSize;
        const req = tx.objectStore(storeName).index(indexName).openCursor(range);
        req.onsuccess = () => { 
          const cursor = req.result;
          if (cursor) { 
            if(cursor.value[indexName].includes(lowerKw)) {
              if(result.length < pageSize) {
                result.push(cursor.value);
              }
              total++
            }
            cursor.continue();
          } else {
            const nextKey = result.length > 0 ? result[result.length - 1][rangeKeyName] : null;
            resolve({total, data: result, nextKey});
          }
        };
        req.onerror = () => reject(req.error)
      };
      transaction ? _search(transaction) : this.begin_transaction(storeName, 'readonly').then(tx => _search(tx));
    })
  }
}

export class keyRange{
  static only(key: any){
    return IDBKeyRange.only(key)
  }
  static lowerBound(key: any, open=false){
    return IDBKeyRange.lowerBound(key, open)
  }
  static upperBound(key: any, open=false){
    return IDBKeyRange.upperBound(key, open)
  }
  static bound(lower: any, upper: any, lowerOpen=false, upperOpen=false){
    return IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)
  }
}