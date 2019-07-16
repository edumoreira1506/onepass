const generate = require('nanoid/generate');
const driver = require('./neo4j');

exports.getEncKeySet = async ({ email }) => {
    const session = driver.session();
    const { records = [] } = await session.readTransaction(tx => {
        return tx.run('MATCH (u: User { email: $emailParam, isVerified: true })-[:KEYSET]->(keySet) RETURN keySet', {
            emailParam: email,
        });
    });
    session.close();
    const { encPriKey, encSymKey } = records.length && records[0].get('keySet').properties;
    return { encPriKey: JSON.parse(encPriKey), encSymKey: JSON.parse(encSymKey) };
};

exports.getVaultData = async ({ email }) => {
    const session = driver.session();
    const { records = [] } = await session.readTransaction(tx => {
        return tx.run(
            'MATCH (u: User { email: $emailParam, isVerified: true })-[:VAULT]->(v: vault) ' +
                'WITH v ' +
                'OPTIONAL MATCH path = (v)-[:PASSWORDS]->()-[:Archive]->() ' +
                'RETURN v, path',
            {
                emailParam: email,
            }
        );
    });
    session.close();
    const { encVaultKey } = records.length && records[0].get('v').properties;
    // ToDo: refactor to return empty object if list is empty
    const encArchiveList = records.map(record => {
        const item = record._fields[1]
            ? {
                  ...record._fields[1].end.properties,
              }
            : null;
        if (item) {
            return {
                encOverview: Object.prototype.hasOwnProperty.call(item, 'encOverview')
                    ? JSON.parse(item.encOverview)
                    : '',
                encDetails: Object.prototype.hasOwnProperty.call(item, 'encDetails') ? JSON.parse(item.encDetails) : '',
                createdAt: Object.prototype.hasOwnProperty.call(item, 'createdAt') ? item.createdAt : '',
                entryId: Object.prototype.hasOwnProperty.call(item, 'entryId') ? item.entryId : '',
            };
        }
        return null;
    });
    return { encVaultKey: JSON.parse(encVaultKey), encArchiveList };
};

exports.saveEncVaultItem = async ({ encDetails, encOverview, email }) => {
    const session = driver.session();
    const vaultItemRandomPrefix = generate('1245689abefklprtvxz', 6);
    const { records = [] } = await session.writeTransaction(tx => {
        return tx.run(
            'MATCH (u: User { email: $emailParam, isVerified: true })-[:VAULT]-(v: vault) ' +
                'MERGE (v)-[:PASSWORDS]->(p: passwordCollection) ' +
                'ON CREATE SET p.userId = v.userId, p.lastItem = 1, p.itemPrefix = $itemPrefixParam ' +
                'ON MATCH SET p.lastItem = p.lastItem + 1 ' +
                'WITH p.itemPrefix + $vaultItemRandomPrefixParam + p.lastItem AS eid, p ' +
                'CREATE (e: entry { entryId: eid, encDetails: $encDetails, encOverview: $encOverview, createdAt: $createdAtParam }) ' +
                'CREATE (p)-[a:Archive { entryId: eid }]->(e) ' +
                'RETURN e',
            {
                emailParam: email,
                itemPrefixParam: 'item_',
                vaultItemRandomPrefixParam: `${vaultItemRandomPrefix}_`,
                encDetails: JSON.stringify(encDetails),
                encOverview: JSON.stringify(encOverview),
                createdAtParam: new Date().toJSON(),
            }
        );
    });
    session.close();
    const entry = records.length && records[0].get('e').properties;
    // Parse if needed
    if (entry) {
        return { status: true };
    }
    return { status: false };
};
