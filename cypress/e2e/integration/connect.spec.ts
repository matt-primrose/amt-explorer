const baseUrl: string = Cypress.env('BASEURL')
const AMTPassword: string = Cypress.env('AMTPASSWORD')
// ---------------------------- Test section ----------------------------

describe('Load Site', () => {
  it('loads initial page properly', () => {
    // Make sure the test always starts at the initial page
    cy.window().then((win) => {
      win.sessionStorage.clear()
    })

    // Go to base site
    cy.visit(baseUrl)

    // Make sure the login page was hit
    cy.url().should('eq', baseUrl)
  })
})

describe('Connect to host', () => {
  it('Fills in password and connects', () => {
        // Go to base site
        cy.visit(baseUrl)
// Enter the password
    cy.get('[data-cy="password"]').type(AMTPassword)
    // Click on the connect button
    cy.get('[data-cy="connectbtn"]').click()
  })
})