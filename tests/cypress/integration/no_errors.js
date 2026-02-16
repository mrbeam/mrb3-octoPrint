// import {prepare_server, login, await_coreui} from "../util/util";
//
// context("Error free page load", () => {
//     let spy;
//     Cypress.on("uncaught:exception", (err, runnable) => {
//         console.error(err);
//         return false;
//     });
//
//     Cypress.on("window:before:load", (win) => {
//         spy = cy.spy(win.console, "error");
//     });
//
//     const username = "admin";
//     const password = "test";
//
//     beforeEach(() => {
//         prepare_server();
//         login(username, password);
//
//         cy.visit("/");
//
//         await_coreui();
//     });
//
//     it("loads without error", () => {
//         expect(spy).not.to.be.called;
//     });
// });

import {await_support_info_page} from "../util/util";

context("Support info page", () => {
    let spy;

    Cypress.on("uncaught:exception", () => false);

    // It is safer to bind this specific to the test, but this works if consistent
    Cypress.on("window:before:load", (win) => {
        spy = cy.spy(win.console, "error");
    });

    it("renders the support information page without console errors", () => {
        cy.visit("/");
        await_support_info_page();

        // FIX: Wrap the assertion so it runs AFTER the page loads
        cy.then(() => {
            expect(spy).to.not.be.called;
        });
    });
});
