# vibe

A programming language optimized for reading.

---

## The two laws

**1. Verbose is fine. Readability wins.**

vibe optimizes for the person reading the code six months later, not the person typing it today. Extra lines are cheap. Ambiguity is expensive. When short-and-clever fights long-and-obvious, long-and-obvious wins.

This is why math breaks into lines instead of using parentheses. Why you copy a value before changing it. Why `uses` lists things the method could have reached anyway.

**2. Nothing floats.**

Every value has an owner. Every value produced goes somewhere by name, on the same line. Every line reads on its own — no scrolling up for context.

This is why `when` tables assign in each row instead of at the top. Why `any` exists as a word instead of letting unowned arguments go bare.

---

## Marks

| mark | means |
|---|---|
| `=>` | assign a value |
| `is` | compare |
| `:` | a setting (header lines) |
| `then` | an action |
| `also` | another action, same branch |
| `end` | closes a named block |
| `#` | comment |
| `---` | section divider (writer's choice, no meaning) |

Anywhere you see `=>` or `then`, something changes.

---

## Naming

| kind | form | example |
|---|---|---|
| object | `obj` + PascalCase | `obj ServiceCall` |
| method | `do` + camelCase | `do dispatch` |
| method call | `.camelCase(args)` | `.dispatch($25)` |
| built-in | past tense or plain noun | `.rounded`, `.count` |
| variable | snake_case | `base_rate` |
| constant | UPPER_SNAKE | `SERVICE_AREA(s)` |
| attribute, declared | `@` + snake_case | `@location` |
| attribute, referenced | owner + `.` + snake_case | `ServiceCall.location` |
| plural | `(s)` — always lowercase, always `s` | `rate(s)`, `@status(s)` |

`obj` and `do` are declaration keywords. They are never repeated at the call site.

`(s)` is punctuation, not English. `child(s)` is fine. It declares a plural and gives you the singular for free in loops.

The underscore-free built-ins tell you what came with the language. If you can find `do someMethod` in the file, it's yours.

---

## Ownership

The dot always points at an owner, and the owner is written in front of it.

```
ServiceCall.location   # this service call's — the default, even inside ServiceCall
Job.load_size          # a Job's
any.wheel_count        # no owner — must be handed in
.location              # shortcut for "mine" — only legal inside an object
```

Name the owner every time, even inside the object that owns the value. A method with two owners, or one read six months later, still says whose value each line touches. Translations into vibe always name the owner.

Inside an object, the owner slot may be left empty as a shortcut: `.location` means the same as `ServiceCall.location`. It is a preference, never the default. Outside an object there is no shortcut — a bare dot outside an object is an error.

A capitalized owner inside a method means the specific one in use — this service call, or the customer that was handed in — never all service calls.

`any` fills the owner slot to say there isn't one. Nothing floats.

In a search, name the item the same way: `every job in job(s) where job.is_rush is True`.

Two places keep a bare dot on purpose, because they name a field rather than point at a value: `of` and `by` on a list (`comp(s).total of .market_rent`), and the `sort by:` and `with:` settings of a database call.

---

## Files

One name per line, at the top, each saying where it comes from.

```
includes ServiceCall from "service_call.vibe"
includes CrewMember from "crew_member.vibe"
includes SERVICE_AREA(s) from "config.vibe"
```

Objects and constants both come in this way. There is no grouping syntax and no wildcard — naming the file is law 1, and a reader should be able to see the project's shape from the top of any file in it.

Built-ins are always there. `http`, `Date`, `Time`, and `print` are never included. A language that makes you ask for `print` has one more thing to forget.

---

## Objects

```
obj ServiceCall

    attr_can_be_used: @response, @status, @price     # writable
    attr_can_be_read: @location, @load_size          # read-only

    starting_attributes:
        uses Customer .location, .load_size
        uses Crew .member
        ---
        @customer  => Customer
        @responder => Crew.member
        @location  => Customer.location
        @load_size => Customer.load_size
        @response can be True or False
        @status(s) are ["Init", "Started", "Rejected", "In Route", "Complete"]
        @price => $0
    end

end
```

`can be` declares true/false. `are [...]` declares a set of choices. `are a list of X` declares a list of objects.

An attribute with nothing after it starts empty. Something outside the constructor fills it in later — for `@id`, that is the database on the first `db.save()`. Name a type after it if you want to say what will go there — `Number` or `String`, capitalized like `Date` and `Time`:

```
    starting_attributes:
        uses any.name, any.email
        ---
        @id
        @name  => any.name
        @email => any.email
    end
```

```
        @id Number
        @reference_code String
```

Until something sets it, an empty attribute `is missing`.

A collection starts empty with `are []`. Nothing is in it yet, and things get added later:

```
        @case(s) are []
        @case(s) are a list of RenewalCase
```

The first line says the collection starts empty. The second also says what it holds — the same choice as `@id` versus `@id Number`. An empty collection is not missing; its `.count` is 0.

`are []` with nothing inside the brackets is always an empty collection. `are ["Init", "Started"]` with values inside is a set of choices.

### Making one

```
service_call => new ServiceCall(customer, crew_member)
```

Arguments match what `starting_attributes` declares, in order. You pass whole objects, not individual fields.

### Objects holding objects

An attribute can hold another object, and holds the real thing — not a copy.

```
@responder => Crew.member

print service_call.responder.name
print service_call.responder.phone
```

Lists of objects work the same way:

```
@service_call(s) are a list of ServiceCall

open_call(s) => every service_call in crew_member.service_call(s) where service_call.status is not "Complete"
```

**Related things get stored, not matched.** If a call has a crew member, put it on the call. Don't keep parallel lists and pair them by position.

Reaching through a read-only attribute to change something is refused.

### Objects holding ids

Only one side of a relationship holds the real object. The other side holds ids.

```
obj ServiceCall
    @responder => Crew.member                 # holds the real CrewMember

obj CrewMember
    @service_call_id(s) are a list of id      # holds ids, not objects
```

`id` is a type. An object declares its own with `@id`.

This is a rule, not a preference. If a ServiceCall holds a CrewMember *and* that CrewMember holds its ServiceCalls, the two point at each other forever and nothing can ever be freed. Rust refuses to compile it; C would let it leak quietly. Holding ids on one side breaks the loop.

Which side holds the real thing is usually obvious: **the side that can't function without it.** A ServiceCall with no responder is incomplete. A CrewMember with no calls is just a person having a quiet day.

Turning ids back into objects uses what is already here — no lookup syntax:

```
call(s) => every service_call in dispatch.service_call(s) where service_call.id is in crew_member.service_call_id(s)
```

That extra step is the cost, and it is the honest one. An id is a promise that something exists somewhere; making you go find it is the language refusing to pretend otherwise.

### Three arguments means an object

When a method needs three or more things handed in, those things are usually one object that hasn't been named yet.

```
# floating — three things with no home
do calculate
    maybe any.item(s), any.tax_line(s), any.context
```

```
# housed — the same three, with an owner
obj TaxCalculation
    attr_can_be_read: @item(s), @tax_line(s), @context

    do calculate
        uses TaxCalculation .item(s), .tax_line(s), .context
```

This is law 2 doing its job. Arguments with no owner are the definition of floating, and the fix is almost never new syntax — it is a missing object. Reach for this before reaching for `any.`

---

## Methods

```
do dispatch
    uses ServiceCall .location, .load_size, .response, .status, .price
    maybe any.surcharge
        starter_value: $0
    ---
    # body
    ---
    output: price
end
```

`uses <Owner>` names where things come from — the owner once, then the fields it hands in. The body names the owner again on each use: `ServiceCall.location`. `uses` and `maybe` take no colon: they name inputs, and a colon marks a setting. Multiple owners get their own lines:

```
    uses ServiceCall .location, .responder
    uses Crew .member, .schedule
```

**Required and owned are two separate questions.** `uses` and `maybe` say whether it must be passed. The owner slot says whether it belongs to something. All four combinations are legal:

```
    uses PropertyLease .address          # required, owned
    uses any.rent_update                 # required, unowned
    maybe PropertyLease .notes           # optional, owned
    maybe any.surcharge                  # optional, unowned
```

`any` was never about optionality. A method can require something that has no owner — a number a user typed, a flag from a form — and `uses any.x` is how it says so.

`maybe` is an optional argument. `starter_value:` says what it is when nobody passed one. An optional argument with no starter value might be missing, and the body handles it with `is missing`.

`output:` sits at the bottom, just before `end`. A method either outputs or changes things — not both.

Dotted entries bind automatically. Only `any.` entries appear at the call site.

```
service_call.dispatch($25)
service_call.dispatch()          # surcharge is $0
```

Outside an object, nothing binds, so everything gets passed:

```
calculatePrice(job, $10)
```

Every header line is a setting. **No line in a header ever does anything.**

---

## Assignment

```
base_rate => $50
ServiceCall.price => base_rate + any.surcharge
service_call => new ServiceCall(customer, crew_member)
SERVICE_AREA(s) => ["South Jordan", "Sandy", "Ogden", "Riverton"]
RATE(s) => {"car": $50, "van": $75, "truck": $120}
```

Secrets and config come from outside the file:

```
API_KEY is from the environment
CUSTOMER_URL is from the environment
```

---

## Built-ins

**Past tense mutates.** `price.rounded` changes `price`.

**Nouns report.** `list.count` changes nothing.

**To protect the original, copy it first:**

```
current_value => car.value
current_value.rounded            # car.value untouched
```

`car.value.rounded` reaches in and changes the car — refused if the attribute is read-only.

**No built-in for something the vocabulary already says.** `.remainder(2) is 0`, not `.isEven`.

**A built-in can hide *how*, not *what*.** `is not in` hiding a loop is fine. It must not hide whether case matters, because that changes the answer:

```
ServiceCall.location.trimmed
ServiceCall.location.lowercased

if ServiceCall.location is not in SERVICE_AREA(s)
```

---

## Arithmetic

**Expressions** use symbols, two values maximum:

```
ServiceCall.price => base_rate + any.surcharge
total => ServiceCall.price - ServiceCall.discount
```

Anything longer breaks into lines. No parentheses, no precedence:

```
extra => job.distance - 20
extra.multiply(2)
```

**Mutation** uses methods:

```
price.add($10)
price.minus($5)
price.multiply(2)
price.divide(3)
price.remainder(2)
price.rounded
```

---

## Conditionals

`when` for tables over one field. `if` for branches.

**`then` takes an action, not a condition.** An action is an assignment, a `print`, a method call, or `stop`/`skip`. If what follows is another `if` or `when`, drop the `then`.

```
when ServiceCall.load_size is "car"    then base_rate => $50
when ServiceCall.load_size is "van"    then base_rate => $75
when ServiceCall.load_size is "truck"  then base_rate => $120
otherwise                               then base_rate => $50
```

```
if ServiceCall.location is not in SERVICE_AREA(s)
    then ServiceCall.response => False
    also ServiceCall.status => "Rejected"
otherwise
    then ServiceCall.response => True
    also ServiceCall.status => "Init"
```

```
if Job.distance is less than 10
    then base_rate => $50
otherwise if Job.distance is less than 50
    then base_rate => $75
otherwise
    then base_rate => $120
```

`also` adds another action under the same branch, indented under `then`. `otherwise` sits back at the `if` level.

### Guards have no otherwise

**`otherwise` is only legal when the `if` is the whole decision.** If another `if` below writes to the same variable, drop it — you are stacking vetoes, not choosing between two outcomes.

A guard is a veto. It can turn an answer off, never back on:

```
can_update => True

if any.rent_update is less than PropertyLease.current_rent_price
    then can_update => False
    also print "Too low, can't go below current rent price"

if any.rent_update is greater than upper_limit_amount
    then can_update => False
    also print "Too high, can't go more than 3% above current rent price"
```

The answer starts True on its own line — nothing is inferred. Each guard can only knock it down. Whatever survives every guard is the answer.

Putting an `otherwise` on either one breaks it:

```
# WRONG
if any.rent_update is less than PropertyLease.current_rent_price
    then can_update => False
otherwise
    then can_update => True          # ← wipes out a False set by the guard below

if any.rent_update is greater than upper_limit_amount
    then can_update => False
otherwise
    then can_update => True          # ← wipes out the False set above
```

A price of $1,500 against a $2,000 rent is too low, so the first guard sets False. It is not too high, so the second `otherwise` runs and sets True. The rejection is gone.

Each guard only knows its own half of the story. When two share an answer, the last one to write wins — so only one of them may be allowed to say yes, and that one is the line at the top.

**The tell:** if two conditions could both be true at once, they are guards. `otherwise` assumes exactly one branch runs, which is a different shape.

`otherwise` stays right where the `if` really is the whole decision:

```
if ServiceCall.location is not in SERVICE_AREA(s)
    then ServiceCall.status => "Rejected"
otherwise
    then ServiceCall.status => "Init"
```

Nested conditions go bare — no `then` before an `if`:

```
if ServiceCall.status is "Init"
    if ServiceCall.due_at is before DateTime.now
        then ServiceCall.status => "Late"
        also print "Overdue: {ServiceCall.location}"
```

---

## Comparisons

```
is / is not
is greater than / is greater or equal to
is less than / is less or equal to
is between the range of x...y
is in / is not in
is missing
is before / is after
is in the same month as
```

**Text**

```
PropertyLease.address contains "Main"
PropertyLease.address starts with "123"
PropertyLease.address ends with "Apt 4"
```

There is no `matches`. It reads general and is vague about the thing that matters — for a date, "matches" could mean the same day, month or year, and the line would not say which. Ranges say it.

---

## and / or

One connector per condition, never mixed — nest instead.

```
if Job.is_rush is True and Job.distance is greater than 20
```

Same field, several values:

```
if ServiceCall.status is "Rejected" or "Complete"
```

Name the list when the group means something:

```
CLOSED_STATUS(s) => ["Rejected", "Complete"]
if ServiceCall.status is in CLOSED_STATUS(s)
```

---

## Collections

**Looping**

```
for each job in job(s)
    print job.id

for each rate in rate(s)
    print rate.key
    print rate.value

do 3 times
    print "ping"

keep going until ServiceCall.status is "Complete"
    ServiceCall.checkStatus()
```

`skip` jumps to the next item. `stop` leaves the loop.

**Finding**

```
first job in job(s) where job.distance is greater than 50
any rate in rate(s) where rate.key is "van"
every job in job(s) where job.is_rush is True
```

`first` and `any` give back one thing. `every` gives back a list, so name it plural.

**Changing a list**

```
add comp to RenewalCase.comp(s)
```

**Reporting**

```
list.count
list.first
list.last
list.rest
```

Filter first, then report:

```
rejected(s) => every service_call in dispatch.service_call(s) where service_call.status is "Rejected"
rejected(s).count
```

**On a list of objects, name the field.** A list of Comps has nothing to add up until you say which number:

```
comp(s).total of .market_rent
comp(s).average of .market_rent
comp(s).highest of .market_rent
comp(s).lowest of .market_rent
comp(s).sorted by .distance
```

`of` reads a value, `by` orders. `.count` is the exception — it counts items, so it never needs a field.

---

## Dates and times

Three built-in objects. Pick by what the thing actually is.

```
Date.today           # a day — invoice due the 15th
Time.now             # a clock reading — we open at 08:00
DateTime.now         # a specific instant — this call came in at 14:32 Tuesday
```

`Time.now` and `DateTime.now` are UTC. A local reading says so:

```
DateTime.now.in("America/Denver")
```

Most attributes are instants. `@created_at`, `@due_at`, `@started_at` all hold a `DateTime`.

Building one from halves:

```
@due_at => DateTime.at(Date.today, 20:00)
@due_at => DateTime.at(2027-06-15, 14:30)
```

A `DateTime` knows both halves, so arithmetic rolls the date when it needs to:

```
@due_at => DateTime.now + 2 hours        # at 23:00, this is tomorrow at 01:00
```

Reading the halves back:

```
ServiceCall.due_at.date  # 2027-06-16
ServiceCall.due_at.time  # 01:00
```

Use `Date` alone for a day with no meaningful hour, and `Time` alone for a clock value that isn't anchored to a day. Anything that happened, or will happen, at a moment is a `DateTime`. Two separate attributes for one moment is the mistake this type exists to prevent — nothing on the page says they move together, and at 23:00 they stop agreeing.

**Literals**

```
2027-06-15                        # year-month-day
20:00                             # 24-hour, the precise form
8pm / 8:00pm                      # loose
20:00:30                          # with seconds
```

A time literal is only as precise as what you wrote. `20:00` matches the whole minute. `12am` and `12pm` are not allowed — use `00:00` and `12:00`.

**Comparing**

```
if ServiceCall.due_at is before DateTime.now  # instant vs instant
if Shop.opens_at is after 20:00               # clock vs clock
if Invoice.invoice_date is Date.today         # day vs day
if PropertyLease.end_date is in the same month as target
```

Date ranges use `is before` / `is after`, never part matching.

**Math**

```
Date.today + 3 days
Date.today + 3 months             # clamps: Jan 31 + 1 month = Feb 28
Time.now - 2 hours
```

**Parts** — nouns, they report

```
.date .time                       # the halves of a DateTime
.day .month .year
.hour .minute .second
.first_day .last_day              # edges of the month a date sits in
```

**Scheduling** lives outside vibe. A cron job is a method something else calls:

```
do markLateCalls
    uses Dispatch .service_call(s)
    ---
    for each service_call in dispatch.service_call(s)
        if service_call.due_at is before DateTime.now
            then service_call.status => "Late"
end
```

Whatever calls it — cron, a queue, a scheduler — decides the rhythm. A job that should only run once a period guards itself, so it is safe to call as often as anything likes:

```
do openRenewalCases
    uses Portfolio .last_opened_date
    ---
    if Date.today.day is not 1
        then stop
    if portfolio.last_opened_date is in the same month as Date.today
        then stop
    ---
    # ... the work ...
    ---
    portfolio.last_opened_date => Date.today
end
```

The rhythm lives in the code where it can be read and is actually enforced, rather than in a header comment pretending to be configuration.

---

## http

```
http.get(CUSTOMER_URL)
    api_key: API_KEY
    target_id: 123238
    response_reference: customer
    ---
    if failed
        then print request.reason
    if refused
        then print response.code
        also print response.reason
end

service_call.location  => customer.address.city
service_call.load_size => customer.load
```

Four verbs: `http.get()`, `http.post()`, `http.put()`, `http.delete()`. URL in the parens.

Settings inside: `api_key:`, `target_id:`, `with:` (the body), `filter(s):`, `response_reference:`.

```
http.get(CUSTOMER_URL)
    api_key: API_KEY
    filter(s):
        status: "active"
        limit: 10
    response_reference: customer(s)
end
```

**`if failed`** — never reached the server. No network, timeout, DNS. Only `request.reason` is available.

**`if refused`** — the server answered no. `response.code` and `response.reason` are available.

Those are two different things, and splitting them is the point. A 404 is a successful request with a refusing answer.

```
    if refused
        when response.code is 404  then print "No such customer"
        when response.code is 401  then print "Bad API key"
        otherwise                   then print response.reason
```

Picking fields off the response happens after, in plain `=>` lines.

**Failure handling is network-only.** Everything else is guarded with ordinary `if`.

---

## The database

An object definition is a shape, not a container. `obj RenewalCase` says what a renewal case *is*. It does not hold any. The real ones are rows, and you ask for them.

A database call is a request leaving the program that can fail, exactly like `http`, so it takes the same block:

```
db.find(PropertyLease)
    filter(s):
        end_date: target.first_day...target.last_day
        status: "Active"
    sort by: .end_date
    limit: 50
    with: .renewal_case(s)
    response_reference: expiring(s)
    ---
    if failed
        then print request.reason
    if refused
        then print response.code
        also print response.reason
end
```

Filter rows are settings, written the same way as in `http`. `status: "Active"` asks for rows whose status is `"Active"`. A range asks for rows inside it: `end_date: target.first_day...target.last_day`. A filter row never uses `is` — the `:` already says what the row wants.

Three verbs: `db.find()`, `db.save()`, `db.delete()`.

```
db.save(renewal_case)
    if failed
        then print request.reason
end
```

`db.save()` inserts when the object has no `@id` and updates when it has one. The object knows which.

### Filters run at the database

This is the reason `filter(s):` exists rather than a loop.

```
# Wrong. Every lease crosses the wire, then most get thrown away.
for each lease in portfolio.lease(s)
    if lease.end_date is in the same month as target
        then add lease to expiring(s)
```

```
# Right. Five rows cross the wire.
db.find(PropertyLease)
    filter(s):
        end_date: target.first_day...target.last_day
    response_reference: expiring(s)
end
```

The same filter, moved to the side of the wire that has an index for it. A transpiler that turns `filter(s):` into fetch-then-filter has produced the wrong program, not a slower one.

Loops are cheap. Loading everything so you can loop is not.

### A find always gives a list

Even when one row matches. Take the one with `.first`:

```
db.find(PropertyLease)
    filter(s):
        id: 4821
    response_reference: match(s)
end

lease => match(s).first
```

No match means an empty list, so `lease` is `is missing` — the same tool as everywhere else. There is no separate "find one" that hides the miss.

### Relations are asked for

`with:` names what to bring along. Nothing related loads silently.

```
    with: .lease, .comp(s)
```

Without it, reaching for `.comp(s)` inside a loop over five hundred cases is five hundred separate trips. Naming it once means one.

---

## Text

```
print "Call #{service_call.id} for {customer.name} — {service_call.price}"
print "Due at {service_call.due_at}"
```

Anything inside `{}` gets its value substituted.

---

## Apps: model, update, view

An interactive app is three things — the data it holds, how messages change it, and what it looks like. vibe borrows this shape from Elm because two thirds of it already existed.

**Model** is an `obj`. Nothing new.

**Update** is a `when` table over a message. `when` tables were built for pricing rules and turn out to be exactly the shape an update wants — and `otherwise` gives the exhaustiveness check for free.

```
obj ServiceCallPage

    attr_can_be_used: @status, @filter_text
    attr_can_be_read: @service_call(s)

    message(s) are ["Dispatch", "Cancel", "Refresh"]

    do update
        uses ServiceCallPage .status
        maybe any.message
        ---
        when any.message is "Dispatch"  then ServiceCallPage.status => "Init"
        when any.message is "Cancel"    then ServiceCallPage.status => "Rejected"
        when any.message is "Refresh"   then ServiceCallPage.loadCalls()
        otherwise                        then print "Unknown message"
    end
```

**View** describes what is on the screen. Elements are bare nouns, content is a string, settings are labeled lines underneath, nesting is indentation. `if` and `for each` are the ones already in the language, so conditional rendering and lists come free.

```
    do view
        uses ServiceCallPage .status, .service_call(s)
        ---
        column
            heading "Service Calls"

            for each service_call in ServiceCallPage.service_call(s)
                row
                    text "{service_call.location}"
                    text "{service_call.price}"

                    if service_call.status is "Init"
                        then button "Dispatch"
                            sends: "Dispatch"

            if ServiceCallPage.service_call(s).count is 0
                then text "Nothing scheduled"
    end

end
```

`sends:` names the message a control emits. It is the view's only connection to update — nothing in a view changes anything directly.

**View is a sketch, not a settled part of the language.** Three things are undecided and each is real work:

- **The element vocabulary.** `column`, `row`, `text`, `button`, `heading` is a widget set someone has to define and defend. HTML tag names are honest about the target and ugly; a vibe-native set is prettier and is its own design project.
- **Messages carrying data.** `"Dispatch"` is a string. `SetFilter "south jordan"` carries a value, which is a union type — the same hole mixed-type lists fall into.
- **Styling.** There is none. CSS is a domain where readability buys nothing, because the problem was never legibility.

Model and update are usable now. View should be treated as a direction.

---

## Endpoints

`http` calls out. `serves:` describes the other end.

```
obj ServiceCallApi

    do listOpen
        serves: GET "/api/service-calls"
        uses Dispatch .service_call(s)
        ---
        open(s) => every service_call in dispatch.service_call(s) where service_call.status is not "Complete"
        ---
        output: open(s)
    end

end
```

A labeled header line like the rest. It mirrors `http.get()` on the calling side, so both ends of the same conversation read the same way.

---

## Blocks

`end` closes named blocks only: `obj`, `do`, `starting_attributes`, and `http` calls. Bare — no need to name what it closes.

`if`, `when`, `for each` and the rest are closed by indentation.

---

## Dividers and comments

`---` is a section divider. It means nothing to the transpiler — it is the writer breaking a block into visible steps, the same category as a comment.

Use it between the header of a method and its body, and between the steps inside a long body. A blank line does the same job; `---` is the stronger break.

```
do dispatch
    uses ServiceCall .location, .status, .price
    ---
    # Guard for out of service areas
    if ServiceCall.location is not in SERVICE_AREA(s)
        then ServiceCall.status => "Rejected"
    ---
    when ServiceCall.load_size is "car"    then base_rate => $50
    otherwise                               then base_rate => $50
    ---
    ServiceCall.price => base_rate
end
```

`#` is a comment. The divider separates, the comment labels. They read well together.

Neither changes what the code does. If a method needs so many dividers that it stops reading as one thing, it probably wants to be two methods — and with `output:` that split is cheap.

---

## Worked example

```
SERVICE_AREA(s) => ["South Jordan", "Sandy", "Ogden", "Riverton"]
API_KEY is from the environment
CUSTOMER_URL is from the environment

obj ServiceCall

    attr_can_be_used: @response, @status, @price
    attr_can_be_read: @location, @load_size, @responder, @customer

    starting_attributes:
        uses Customer .location, .load_size
        uses Crew .member
        ---
        @customer  => Customer
        @responder => Crew.member
        @location  => Customer.location
        @load_size => Customer.load_size
        @response can be True or False
        @status(s) are ["Init", "Started", "Rejected", "In Route", "Complete"]
        @price => $0
    end

    do dispatch
        uses ServiceCall .location, .load_size, .response, .status, .price
        maybe any.surcharge
            starter_value: $0
        ---
        # Guard for out of service areas
        if ServiceCall.location is not in SERVICE_AREA(s)
            then ServiceCall.response => False
            also ServiceCall.status => "Rejected"
        otherwise
            then ServiceCall.response => True
            also ServiceCall.status => "Init"
        ---
        when ServiceCall.load_size is "car"    then base_rate => $50
        when ServiceCall.load_size is "van"    then base_rate => $75
        when ServiceCall.load_size is "truck"  then base_rate => $120
        otherwise                               then base_rate => $50
        ---
        ServiceCall.price => base_rate + any.surcharge
        ServiceCall.price.rounded
    end

end
```

---

## Versions

**v0** transpiles via LLM. This document is the spec — precise enough that two models should produce the same translation, in either direction.

v0 is not a product. It is a test harness. Every rule here was designed against examples chosen to make it look good. The LLM transpiler is the cheapest way to find out what happens when vibe meets a real file: paste TypeScript, watch where the model improvises, and every improvisation is a hole in this document.

**v1 targets Rust.**

Rust fits vibe unusually well:

| vibe | Rust |
|---|---|
| `attr_can_be_used` / `attr_can_be_read` | `&mut` / `&` |
| copy before you change it | what the borrow checker requires anyway |
| `@status(s) are [...]` | `enum` |
| `is missing` | `Option` |
| `if failed` / `if refused` | `Result`, with the network/refusal split already made |
| `every`/`first`/`any ... where` | `filter` / `find` / `any` |
| dates, http, JSON | `chrono`, `reqwest`, `serde` |

Rust would refuse **objects holding each other both ways** — a reference cycle nothing can free. C would compile it and leak quietly. That refusal is why the ids rule exists: one side holds the real object, the other holds ids. The rule was a spec decision, made because Rust would have forced it.

---

## Known open questions

- **Messages carrying data, and mixed-type lists.** These are one problem. `"Dispatch"` is a string; `SetFilter "south jordan"` carries a value. A list holding both item and shipping tax lines is the same shape. Solving either solves both.
- **Money precision.** `.rounded` mutates in place, so rounding happens wherever it is written. Real billing systems keep full precision through every intermediate step and round only when a value leaves the system. vibe currently has no way to say "this is an intermediate value." This is on vibe's home turf and should be settled.
- **The view vocabulary.** `column`, `row`, `text`, `button` is a placeholder. The element set, styling, and messages that carry data are all unsettled. See the apps section.
- **Async is a decision, not a gap.** vibe has no concept for waiting or concurrency, and is not getting one. Every call waits. Concurrency needs a runtime, which is a different project. Translated code reads as if everything is instant — that should be flagged in output rather than fixed here.
- **Calling a method from inside a method.** `output:` hands a value back and the call syntax exists, but the spec never shows one method calling another as an expression. It is implied, not stated.
- **`output:` naming an expression.** It names a variable. `output: rejected(s).count` may not be legal, which would mean an extra line every time a method returns a count or a total.
- **Transactions.** A job that creates a case and writes an id back to a lease has two saves. If the second fails, the first is already committed and you have an orphan. vibe has no concept for "these go together or neither does."
- Time zones beyond `.in(...)` — nothing handles a call crossing zones
- Fuzzy durations (`1 month`) clamp, but the rule should be tested against real billing
- Lists are growable, since `add X to list` exists. Rust will need a concrete type for that — worth stating before any compiler work.
- **A collection that starts with values.** `are []` starts empty and `are ["Init", "Started"]` is a set of choices, so there is no way yet to say "a list that starts holding these values" — `RATE(s) => [$50, $75]` works for constants, but not for an attribute.
- `as long as` and `.at(position)` were drafted for translating counted loops and then dropped. They may need to come back when real code demands them.

**Enforceable:** the guards rule is checkable at write time. An `if` with an `otherwise` that writes to a variable another `if` in the same block also writes to is the bug above, every time. A transpiler should refuse it rather than translate it.

**Closed:** two-way object references and free-standing methods taking lists (the ids and three-arguments rules). A date carrying a time (`DateTime`). Persistence (`db.find` / `db.save` / `db.delete`). Adding to a list (`add X to list`). Naming the field on list built-ins (`of` and `by`). `runs:` was removed — a scheduled job guards itself in the body instead.
