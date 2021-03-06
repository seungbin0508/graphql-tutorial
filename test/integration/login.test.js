import test from "node:test";
import {ApolloServer} from "apollo-server";
import fs from "fs/promises";
import path from "path";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {Mutation} from "../../src/resolvers/index.js";
import {createMember} from "../../src/user/db.js";
import createInMemoryConnection from "../../src/utils/inMemoryDB.js";

await test("login", async t => {
    const client = await createInMemoryConnection();
    const testServer = new ApolloServer({
        typeDefs: await fs.readFile(path.join(path.resolve(), "docs/graphql/schema.graphql"), "utf-8"),
        resolvers: {Mutation},
        context: async () => ({
            client
        })
    });

    async function queryLogin(input) {
        return await testServer.executeOperation({
            // language=GraphQL
            query: `
                mutation Login($input: LoginInput!) {
                    login(input: $input) {
                        token
                        user {
                            name
                            email
                        }
                    }
                }
            `,
            variables: {input}
        });
    }

    await t.test("should return token", async () => {
        await createMember({client}, {
            email: "seungbin0508@gmail.com",
            name: "SeungBin Kim",
            password: "password"
        });
        try {
            const res = await queryLogin({
                email: "seungbin0508@gmail.com",
                password: "password"
            });

            const {errors} = res;
            assert.equal(errors, undefined);

            const {data: {login: {token, user: {name, email}}}} = res;

            // noinspection JSCheckFunctionSignatures
            jwt.verify(token, "jwt-secret");
            assert.equal(name, "SeungBin Kim");
            assert.equal(email, "seungbin0508@gmail.com");
        } catch (e) {
            assert.ifError(e);
        } finally {
            await client.stopDatabase();
        }

    });
});