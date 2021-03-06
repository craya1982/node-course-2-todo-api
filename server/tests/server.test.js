const expect = require('expect')
const request = require('supertest')
const { ObjectID } = require('mongodb')

const { app } = require('./../server')
const { Todo } = require('./../model/todo')
const { User } = require('./../model/user')
const { todos, populateTodos, populateUsers, users } = require('./seed/seed')

beforeEach(populateUsers)
beforeEach(populateTodos)

describe('POST /todos', () => {
    it('should create a new todo', (done) => {
        var text = 'Test todo text'

        request(app)
            .post('/todos')
            .send({ text })
            .expect(200)
            .expect((res) => {
                expect(res.body.text).toBe(text)
            })
            .end((err, res) => {
                if (err) {
                    return done(error)
                }
                Todo.find({ text }).then((todos) => {
                    expect(todos.length).toBe(1)
                    expect(todos[0].text).toBe(text)
                    done()
                }).catch((e) => done(e))
            })

    })

    it('should not create todo with invalid body data', (done) => {
        request(app)
            .post('/todos')
            .send({ text: "" })
            .expect(400)
            .end((err, res) => {
                if (err) {
                    return done(error)
                }
                Todo.find().then((todos) => {
                    expect(todos.length).toBe(2)
                    done()
                }).catch((e) => done(e))
            })
    })
})

describe('Get /todos', () => {
    it('should get all todos', (done) => {
        request(app)
            .get('/todos')
            .expect(200)
            .expect((res) => {
                expect(res.body.todos.length).toBe(2)
            })
            .end(done)
    })
})

describe('Get /todos/:id', () => {
    it('should return todo doc', (done) => {
        request(app)
            .get(`/todos/${todos[0]._id.toHexString()}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe(todos[0].text)
            })
            .end(done)
    })

    it('should return a 404 if todo not found', (done) => {
        request(app)
            .get(`/todos/${new ObjectID().toHexString()}`)
            .expect(404)
            .end(done)
    })

    it('should return a 404 for non-object ids', (done) => {
        request(app)
            .get(`/todos/1234`)
            .expect(404)
            .end(done)
    })
})

describe('DELETE /todos/:id', () => {
    it('should remove a todo', (done) => {
        var hexId = todos[1]._id.toHexString()

        request(app)
            .delete(`/todos/${hexId}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.todo._id).toBe(hexId)
            })
            .end((err, res) => {
                if (err) {
                    return done(err)
                }
                Todo.findById(hexId).then((todo) => {
                    expect(todo).toNotExist()
                    done()
                }).catch((err) => done(err))
            })
    })

    it('should return 404 if todo not found', (done) => {
        var hexId = new ObjectID().toHexString()

        request(app)
            .delete(`/todos/${hexId}`)
            .expect(404)
            .end(done)
    })

    it('should return 404 if object id is invalid', (done) => {
        request(app)
            .delete(`/todos/asdfagadsg`)
            .expect(404)
            .end(done)
    })
})

describe('PATCH /todos/:id', () => {
    it('should update the todo', (done) => {
        request(app)
            .patch(`/todos/${todos[0]._id.toHexString()}`)
            .send({
                completed: true,
                text: "New text"
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.text).toBe("New text")
                expect(res.body.todo.completed).toBeTruthy()
                expect(res.body.todo.completedAt).toBeA('number')
            })
            .end(done)
    })

    it('should clear completedAt when todo is not completed', (done) => {
        request(app)
            .patch(`/todos/${todos[1]._id.toHexString()}`)
            .send({
                completed: false
            })
            .expect(200)
            .expect((res) => {
                expect(res.body.todo.completedAt).toNotExist()
            })
            .end(done)
    })
})

describe('GET /users/me', () => {
    it('should return user if authenticated', (done) => {
        request(app)
            .get('/users/me')
            .set('x-auth', users[0].tokens[0].token)
            .expect(200)
            .expect((res) => {
                expect(res.body._id).toBe(users[0]._id.toHexString())
                expect(res.body.email).toBe(users[0].email)
            })
            .end(done)
    })

    it('should return 401 if not authenticated', (done) => {
        request(app)
            .get('/users/me')
            .expect(401)
            .expect((res) => {
                expect(res.body).toEqual({})
            })
            .end(done)
    })
})

describe('POST / users', () => {
    it('should create a user', (done) => {
        var email = "exmpl@mg.com"
        var password = "123abc!"

        request(app)
            .post('/users')
            .send({ email, password })
            .expect(200)
            .expect((res) => {
                expect(res.headers['x-auth']).toExist()
                expect(res.body.email).toBe('exmpl@mg.com')
                expect(res.body._id).toExist()
            })
            .end((err) => {
                if (err) {
                    return done(err)
                }

                User.findOne({ email }).then((user) => {
                    expect(user).toExist()
                    expect(user.password).toNotBe(password)
                    done()
                })
            })
    })

    it('should return validation errors if request invalid', (done) => {
        var email = "exmpl@mg.com"
        var password = ""

        request(app)
            .post('/users')
            .send({ email, password })
            .expect(400)
            .end(done)
    })

    it('should not create user if email in user', (done) => {
        var email = users[0].email
        var password = "12345"

        request(app)
            .post('/users')
            .send({ email, password })
            .expect(400)
            .end(done)
    })
})