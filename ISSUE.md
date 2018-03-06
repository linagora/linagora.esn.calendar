# Issues

The idea of this document is to describe the huge bug/issues that we may encounter in the Calendar code. By doing so, we may help next developers once they start working with the Calendar code so they do not need to debug from scratch each time.

## ical.js

By having a look on the source code of the ical.js we found that the main functionalities are provided through `_properties` object. This object keep a subset of the vevent properties while keeping their index. With example everything becomes simpler. Imagine that we are in the ical.js library:

    * vevent: {1: A, 2: B, 3: C, 4: D}

If we need to add the property `A` and `B` in `_properties`, ical.js keeps the same indexes. So we will have

    * _properties: {1: A, 2: B}

Now the bug comes from a code that remove some properties:

    * vevent.removeProperty('A');
    // this results in ==> 
    vevent: {1: B, 2: C, 3: D} // changes
    _properties: {1: A, 2: B} // No change

By doing so the indexes in `vevent` are updated **but not in the _properties**. 

However, it is worth nothing that all `get` operation in ical.js are search the index from the `vevent` and get their value from the `_properties`. (have a look on `_hydrateProperty()` function in ical.js)

Now in the code if we want to get `B`, ical.js will find that its index in `vevent` is `1` and its value in `_properties` is `A`. Et Voila!

### workaround

We should do a PR in ical.js. While waiting, we can `clone` the CalendarShell after we remove properties so as to reconstruct a new ical object with the right `_properties` and `vevent` which match correctly.

