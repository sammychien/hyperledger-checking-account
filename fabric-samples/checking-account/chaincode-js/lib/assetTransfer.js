/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

    async InitLedger(ctx) {
        const assets = [
            {
                ID: 'account1',
                Name: 'Uno',
                Balance: 50,
                AuthedParties: {},
            },
            {
                ID: 'account2',
                Name: 'Dos',
                Balance: 100,
                AuthedParties: {},
            }
        ];

        for (const asset of assets) {
            asset.AuthedParties[ctx.clientIdentity.getID()] = 2;
            await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
            console.info(`Asset ${asset.ID} initialized`);
        }
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    /**
     * Below are the functions necessary for checking account
     *
     */

    async createAccount(ctx, name) {
        const userId = ctx.clientIdentity.getID();
        const newAccount = {
            ID: userId,
            Name: name,
            Balance: 0,
            AuthedParties: {},
        };
        ctx.stub.putState(userId, Buffer.from(JSON.stringify(newAccount)));
        return JSON.stringify(newAccount);
    }

    async accountExists(ctx, accountId) {
        const accountJSON = await ctx.stub.getState(accountId);
        return accountJSON && accountJSON.length > 0;
    }

    async getAccountWithId(ctx, id) {
        const accountJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!accountJSON || accountJSON.length === 0) {
            throw new Error(`The account ${id} does not exist`);
        }
        return JSON.parse(accountJSON);
    }

    async getOwnAccount(ctx) {
        const userId = ctx.clientIdentity.getID();
        const account = await this.getAccountWithId(ctx, userId);
        return account;
    }

    async deposit(ctx, amount) {
        const userId = ctx.clientIdentity.getID();
        const account = await this.getOwnAccount(ctx);
        account.Balance = Number(account.Balance) + Number(amount);
        await ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
        return JSON.stringify(account);
    }

    async withdraw(ctx, amount) {
        const userId = ctx.clientIdentity.getID();
        const account = await this.getOwnAccount(ctx);
        if (Number(account.Balance) < Number(amount)) {
            throw new Error(`The client does not have enough money in account to withdraw ${amount}`);
        }
        account.Balance = Number(account.Balance) - Number(amount);
        await ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
        return JSON.stringify(account);
    }

    async transfer(ctx, recipient, amount) {
        const withdrawResponse = await this.withdraw(ctx, amount);
        const recipientAccount = await this.getAccountWithId(ctx, recipient);
        if (!recipientAccount || recipientAccount.length === 0) {
            throw new Error(`The account ${recipient} does not exist`);
        }

        recipientAccount.Balance = Number(recipientAccount.Balance) + Number(amount);
        await ctx.stub.putState(recipient, Buffer.from(JSON.stringify(recipientAccount)));
        return withdrawResponse;
    }

    async getBalance(ctx) {
        const account = await this.getOwnAccount(ctx);
        return account.Balance.toString();
    }

    async authorizeThirdParty(ctx, thirdPartyId, numUses) {
        const userId = ctx.clientIdentity.getID();
        const account = await this.getOwnAccount(ctx);
        account.AuthedParties[thirdPartyId] = Number(numUses);
        await ctx.stub.putState(userId, Buffer.from(JSON.stringify(account)));
        return JSON.stringify(account);
    }

    async balanceCheck(ctx, targetAccountId, amount) {
        const userId = ctx.clientIdentity.getID();
        const targetAccount = await this.getAccountWithId(ctx, targetAccountId);

        if (!(userId in targetAccount.AuthedParties)) {
            throw new Error(`${userId} is not an authorized third party for account ${targetAccountId}`);
        }
        if (targetAccount.AuthedParties[userId] <= 0) {
            throw new Error(`${userId} has no more checks available for account ${targetAccountId}`);
        }

        targetAccount.AuthedParties[userId] = Number(Number(targetAccount.AuthedParties[userId]) - Number(1));
        await ctx.stub.putState(targetAccountId, Buffer.from(JSON.stringify(targetAccount)));

        if (Number(targetAccount.Balance) >= Number(amount)) {
            return `${targetAccountId} has at least ${amount}.`;
        } else {
            return `${targetAccountId} does not have at least ${amount}.`;
        }


    }
}

module.exports = AssetTransfer;
