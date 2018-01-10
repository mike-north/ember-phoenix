# Ember Phoenix README.md
# Ember-phoenix [![Build Status](https://travis-ci.org/mike-north/ember-phoenix.svg?branch=master)](https://travis-ci.org/mike-north/ember-phoenix) [![Ember Observer Score](https://emberobserver.com/badges/ember-phoenix.svg)](https://emberobserver.com/addons/ember-phoenix) [![npm version](https://badge.fury.io/js/ember-phoenix.svg)](https://badge.fury.io/js/ember-phoenix)

[![Greenkeeper badge](https://badges.greenkeeper.io/mike-north/ember-phoenix.svg)](https://greenkeeper.io/)

## Installation

```
ember install ember-phoenix
```

## Low-Level Use

You can import phoenix framework client-side utilities as an ES6 module

```js
import { Socket } from 'phoenix';

let socket = new Socket('/socket', {
  logger: ((kind, msg, data) => {
    console.log(`${kind}: ${msg}`, data);
  })
});
```

## Detailed Use
The snippets of code below document a complete real-world use case where an Ember app creates, edits and deletes, an Ember Data object, persists it to a Phoenix server, and the Phoenix server broadcasts that new object to any listening browser sessions. This functionality goes well beyond a banal chat app. This is not a how-to, but instead shows you the code you need to make this use case work.

The code examples below have two models: `user` and `todo_list`. The `list_item` model is an exercise for the reader.  The examples also assume you can manage all the boilerplate Phoenix and Ember code.

These examples are current as of January 2018 and use Phoenix 1.3 and Ember 2.18. I called the application “todobird” because it’s a todo app, and because a Phoenix is a bird.

### Making your Phoenix API a JSONAPI API
You’ll need to add two dependencies to your `mix.exs` file - `ja_resource` and `corsica`. `ja_resource` depends on `ja_serializer`. You’ll want to consult both of their documentations if anything goes wrong.

```elixir
  def application do
    [
    ...
      extra_applications: [:logger, :runtime_tools, :comeonin, :ja_resource]
    ]
  end

...

  defp deps do
    [
    ...
      {:pbkdf2_elixir, "~> 0.12"},
      {:ja_resource, "~> 0.3.0"},
      {:corsica, "~> 1.1.0"}
    ]
  end
```

Configure Phoenix to use `ja_resource` and `ja_serializer`:

```elixir
# config/config.exs
...
# Configure JaResource and JaSerializer
config :ja_resource, repo: Todobird.Repo
config :phoenix, :format_encoders, "json-api": Poison
config :mime, :types, %{
  "application/vnd.api+json" => ["json-api"]
}
...
```

**IMPORTANT** you must recompile mime:
```bash
mix deps.clean mime --build
mix deps.get
```

`JaSerializer` can make your Phoenix views automatically respond with JSONAPI by adding functionality when you `use TodobirdWeb, :view`. You have to include the following:

```elixir
# lib/todobird_web.ex
defmodule TodobirdWeb do
  ...
  def view do
    ...
    use JaSerializer.PhoenixView
    ...
  end
  ...
end
```

Configure Corsica to allow CORS requests. The `allow_headers` portion is critical if you want to enable creates and updates from your Ember app.

```elixir
# lib/todobird_web/endpoint.ex
  ...
  plug Plug.Session,
    store: :cookie,
    key: "_todobird_key",
    signing_salt: "5O4zVmvT"

  plug Corsica, origins: "*", allow_headers: ["content-type"]

  plug TodobirdWeb.Router
  ...
```

Configure the Phoenix router. Note that the API is flat, rather than nested. Ember Data doesn’t play well with nested APIs.

```elixir
defmodule TodobirdWeb.Router do
  use TodobirdWeb, :router

  pipeline :api do
    plug :accepts, ["json-api"]
    plug JaSerializer.ContentTypeNegotiation
    plug JaSerializer.Deserializer
  end

  scope "/api/v1", TodobirdWeb do
    pipe_through :api

    resources "/users", V1.UserController, except: [:new, :edit]
    resources "/todo-lists", V1.TodoListController, except: [:new, :edit]
  end
end
```

Create your views and controllers.

```elixir
# lib/todobird_web/controllers/v1/user_controller.ex
defmodule TodobirdWeb.V1.UserController do
  use TodobirdWeb, :controller

  use JaResource
  plug JaResource

  import Ecto.Query

  def model, do: Todobird.Accounts.User

  def records(%Plug.Conn{params: %{"include" => include}}) do
    includes = String.split(include, ",")
    query = model()
    query = if "todo_lists" in includes, do: preload(query, :todo_lists)
    query
  end

  def records(%Plug.Conn{}) do
    model()
  end

  def filter(_conn, query, "name", name) do
    where(query, name: ^name)
  end

  def filter(_conn, query, "email", email) do
    where(query, email: ^email)
  end
end
```

```elixir
# lib/todobird_web/controllers/v1/todo_list_controller.ex
defmodule TodobirdWeb.V1.TodoListController do
  use TodobirdWeb, :controller

  use JaResource
  plug JaResource

  import Ecto.Query

  def model, do: Todobird.Todos.TodoList

  def records(%Plug.Conn{params: %{"include" => include}}) do
    includes = String.split(include, ",")
    query = model()

    # Add a line like this for every preload you want to allow; JaResource requires that you add them one-by-one
    query = if "user" in includes, do: preload(query, :user)
    
    query
  end

  def records(%Plug.Conn{}) do
    model()
  end

  def filter(_conn, query, "user_id", user_id) do
    where(query, user_id: ^user_id)
  end
end
```

```elixir
# lib/todobird_web/views/v1/user_view.ex
defmodule TodobirdWeb.V1.UserView do
  use TodobirdWeb, :view

  attributes [:id, :email, :name]
  has_many :todo_lists,
    serializer: TodobirdWeb.V1.TodoListView
end

# lib/todobird_web/views/v1/todo_list_view.ex
defmodule TodobirdWeb.V1.TodoListView do
  use TodobirdWeb, :view

  attributes [:id, :name, :description]
  has_one :user,
    serializer: TodobirdWeb.V1.UserView,
    identifiers: :when_included
end
```

Configure the `user_socket`:

```elixir
# lib/todobird_web/channels/user_socket.ex
defmodule TodobirdWeb.UserSocket do
  use Phoenix.Socket

  ## Channels
  channel "user:*", TodobirdWeb.UserChannel
...
```

Add the `user_channel`. This is where the meat of sockets functionality lies. The code will make more sense in the context of the Ember app. To keep things simple, there is no authentication, and everybody communicates through the `user:lobby` channel.

```elixir
# lib/todobird_web/channels/user_channel.ex
defmodule TodobirdWeb.UserChannel do
  use TodobirdWeb, :channel

  def join("user:lobby", payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def join("user:" <> _user_id, _params, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  def handle_in("updatedTodoList", payload, socket) do
    {todo_list_id, _} = Integer.parse(payload["todoListId"])
    todo_list = Todobird.Todos.get_todo_list!(todo_list_id)
    newpayload = JaSerializer.format(TodobirdWeb.V1.TodoListView, todo_list)
    broadcast socket, "updatedTodoList", newpayload
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("deletedTodoList", payload, socket) do
    IO.inspect payload, label: "Payload"
    broadcast socket, "deletedTodoList", payload
    {:reply, {:ok, payload}, socket}
  end

  def handle_in("newTodoList", payload, socket) do
    {todo_list_id, _} = Integer.parse(payload["todoListId"])
    todo_list = Todobird.Todos.get_todo_list!(todo_list_id)
    |> Todobird.Repo.preload(:user)
    newpayload = JaSerializer.format(TodobirdWeb.V1.TodoListView, todo_list, %{}, %{include: "user"})
    broadcast socket, "newTodoList", newpayload
    {:reply, {:ok, payload}, socket}
  end
end
```

There are 3 possible messages that can be received: `updatedTodoList`, `deletedTodoList` and `newTodoList`. In the updated and new item cases, the code receives the `todoListId` from the `payload`, loads the record from the Repo, formats it in JSONAPI format, and `broadcast`s that new payload to all the listeners on the socket.

### Configuring Ember.js to talk to the Phoenix socket
As described above, start by installing `ember-phoenix`:

`ember install ember-phoenix`

Create a socket service with `ember g service user-socket`:

```js
// app/services/user-socket.js
import PhoenixSocket from 'phoenix/services/phoenix-socket';
import { inject } from '@ember/service';

export default PhoenixSocket.extend({
  store: inject(),
  channels: null,

  init() {
    this.set('channels', []);
  },

  connect(/*url, options*/) {
    this._super('ws://localhost:4000/socket', {});

    const channel = this.joinChannel("user:lobby", {
      nickname: "Nobody"
    });

    this.get('channels').pushObject(channel);
  }
});
```

The heavy lifting of communicating with the socket is done in controllers (as in this example) or in components. The `admin/todo-list` route & controller show the user’s todo_lists. The `admin/todo-list/new` and `.../edit` routes are used to add and edit new todo_lists. 

Liberally sprinkled with comments, the corresponding controllers are as follows:

```js
// app/controllers/admin/todo-list.js
import Controller from '@ember/controller';
import { inject } from '@ember/service';

export default Controller.extend({
  'user-socket': inject(),

  init() {
    this._super(...arguments);
    let socket = this.get('user-socket');
    socket.connect();
    let channel = socket.get('channels')[0];
    channel.on("open", this.onOpened);
    channel.on("newTodoList", (payload) => this.onNewTodoList(payload));
    channel.on("updatedTodoList", (payload) => this.onUpdatedTodoList(payload));
    channel.on("deletedTodoList", (payload) => this.onDeletedTodoList(payload));
  },

  onOpened() {
    console.log('socket was opened!');
  },

  onNewTodoList(payload) {
    console.log("loading payload into store");
    console.log(payload);
    this.get('store').push(payload);
  },

  onUpdatedTodoList(payload) {
    console.log("loading payload into store");
    console.log(payload);
    this.get('store').push(payload);
  },

  onDeletedTodoList(payload) {
    console.log("removing item referenced by payload from store");
    console.log(payload);
    // debugger;
    var tl = this.get('store').peekRecord('todoList', parseInt(payload.todoListId));
    console.log(tl);
    if (tl) {
      tl.get('user.todoLists').removeObject(tl);
      tl.unloadRecord(tl);
    }
  },

  actions: {
    delete(list) {
      if (confirm('Are you sure you want to delete this todo list?')) {
        list.destroyRecord().then(() => {
          console.log("sending deletedTodoList");
          let socket = this.get('user-socket');
          let channel = socket.get('channels')[0]
          channel.push("deletedTodoList", {todoListId: list.get('id')})
            .receive("ok", (msg) => console.log("sent deletedTodoList"))
        });
      }
    },

    ping() {
      console.log("pinging");
      let socket = this.get('user-socket');
      socket.socket.channels[0].push("ping", {})
        .receive("ok", (payload) => console.log("ping was received"));
    }
  }
});
```

```js
// app/controllers/admin/todo-list/new.js
import Controller from '@ember/controller';
import { inject } from '@ember/service';

export default Controller.extend({
  'user-socket': inject(),

  actions: {
    submit() {
      var newTodoList = this.store.createRecord('todoList', {
        name: this.get('name'),
        description: this.get('description'),
        user: this.get('model')
      });
      newTodoList.save()
      .then(() => {
        this.set('name', '');
        this.set('description', '');
        this.get('model.todoLists').pushObject(newTodoList);

        console.log("sending newTodoList");
        let socket = this.get('user-socket');
        let channel = socket.get('channels')[0]
        channel.push("newTodoList", {todoListId: newTodoList.get('id')})
          .receive("ok", (msg) => console.log("sent newTodoList"))

      this.transitionToRoute('admin.todo_list', this.get('model.id'));
      })
    }
  }
});
```

```js
// app/controllers/admin/todo-list/edit.js
import Controller from '@ember/controller';
import { inject } from '@ember/service';

export default Controller.extend({
  'user-socket': inject(),

  actions: {
    submit() {
      var todoList = this.get('model');
      todoList.set('name', this.get('name'));
      todoList.set('description', this.get('description'));
      todoList.save()
      .then(() => {
        this.set('name', '');
        this.set('description', '');

        console.log("sending updatedTodoList");
        let socket = this.get('user-socket');
        let channel = socket.get('channels')[0]
        channel.push("updatedTodoList", {todoListId: todoList.get('id')})
          .receive("ok", (msg) => console.log("sent updatedTodoList"))

        this.transitionToRoute('admin.todo_list', this.get('model.user.id'));
      })
    }
  }
});
```

And the routes, for reference:

```js
// app/routes/admin/todo-list.js
import Route from '@ember/routing/route';

export default Route.extend({
  model(params) {
    return this.store.findRecord('user', params.user_id);
  }
});
```

```js
// app/routes/admin/todo-list/new.js
import Route from '@ember/routing/route';

export default Route.extend({
});
```

```js
// app/routes/admin/todo-list/edit.js
import Route from '@ember/routing/route';

export default Route.extend({
  model(params) {
    return this.store.findRecord('todoList', params.list_id)
  },

  setupController(controller, model) {
    this._super(controller, model);
    controller.set('name', model.get('name'));
    controller.set('description', model.get('description'));
  }
});
```

## Contributing

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `npm test` (Runs `ember try:testall` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).

## Copyright

(c) 2016 Levanto Financial
