package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/list"
	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/log"

	"admin-tui/internal/api"
)

type mode int

const (
	modeList mode = iota
	modeAdd
	modeConfirmDelete
)

type usersLoadedMsg struct {
	users []api.User
}

type userCreatedMsg struct {
	user api.User
}

type userDeletedMsg struct {
	id string
}

type errMsg struct {
	err error
}

func (e errMsg) Error() string {
	if e.err == nil {
		return ""
	}
	return e.err.Error()
}

type statusMsg string

type userItem struct {
	user api.User
}

func (u userItem) Title() string {
	name := u.user.Name
	if name == "" {
		name = "Unnamed user"
	}
	return name
}

func (u userItem) Description() string {
	role := u.user.Role
	if role == "" {
		role = "User"
	}

	email := u.user.Email
	if email == "" {
		email = "No email"
	}

	return fmt.Sprintf("%s • %s", email, role)
}

func (u userItem) FilterValue() string {
	return strings.ToLower(strings.TrimSpace(u.user.Name + " " + u.user.Email + " " + u.user.Role))
}

type model struct {
	client       *api.Client
	list         list.Model
	spinner      spinner.Model
	inputs       []textinput.Model
	focusIndex   int
	mode         mode
	status       string
	err          error
	loading      bool
	deletingUser *api.User
	users        []api.User
	width        int
	height       int
}

func initialModel() model {
	baseURL := os.Getenv("USERS_API_URL")
	if baseURL == "" {
		baseURL = os.Getenv("USERS_API_BASE_URL")
	}

	client := api.NewClient(baseURL)

	spinnerModel := spinner.New()
	spinnerModel.Spinner = spinner.Dot

	listDelegate := list.NewDefaultDelegate()
	listDelegate.ShowDescription = true
	listDelegate.SetSpacing(1)

	listModel := list.New([]list.Item{}, listDelegate, 0, 0)
	listModel.Title = "Tessaro Users"
	listModel.SetShowStatusBar(false)
	listModel.SetFilteringEnabled(true)
	listModel.SetShowHelp(false)
	listModel.Styles.Title = lipgloss.NewStyle().Foreground(lipgloss.Color("205")).Bold(true)

	inputs := make([]textinput.Model, 3)

	nameInput := textinput.New()
	nameInput.Placeholder = "Full name"
	nameInput.Prompt = "Name > "
	nameInput.CharLimit = 128
	nameInput.Focus()
	inputs[0] = nameInput

	emailInput := textinput.New()
	emailInput.Placeholder = "Email"
	emailInput.Prompt = "Email > "
	emailInput.CharLimit = 256
	inputs[1] = emailInput

	roleInput := textinput.New()
	roleInput.Placeholder = "Role (e.g. Administrator)"
	roleInput.Prompt = "Role > "
	roleInput.CharLimit = 64
	roleInput.SetValue("Administrator")
	inputs[2] = roleInput

	return model{
		client:     client,
		list:       listModel,
		spinner:    spinnerModel,
		inputs:     inputs,
		focusIndex: 0,
		mode:       modeList,
		loading:    true,
		status:     "Loading users…",
	}
}

func (m model) Init() tea.Cmd {
	return tea.Batch(fetchUsers(m.client), spinner.Tick)
}

func fetchUsers(client *api.Client) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()

		users, err := client.ListUsers(ctx)
		if err != nil {
			return errMsg{err: err}
		}

		return usersLoadedMsg{users: users}
	}
}

func createUser(client *api.Client, payload api.CreateUserRequest) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()

		user, err := client.CreateUser(ctx, payload)
		if err != nil {
			return errMsg{err: err}
		}

		return userCreatedMsg{user: user}
	}
}

func deleteUser(client *api.Client, id string) tea.Cmd {
	return func() tea.Msg {
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()

		if err := client.DeleteUser(ctx, id); err != nil {
			return errMsg{err: err}
		}

		return userDeletedMsg{id: id}
	}
}

func (m *model) setUsers(users []api.User) {
	selectedID := m.selectedUserID()

	sorted := make([]api.User, len(users))
	copy(sorted, users)
	sort.Slice(sorted, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(sorted[i].Name))
		right := strings.ToLower(strings.TrimSpace(sorted[j].Name))
		if left == right {
			leftEmail := strings.ToLower(strings.TrimSpace(sorted[i].Email))
			rightEmail := strings.ToLower(strings.TrimSpace(sorted[j].Email))
			if leftEmail == rightEmail {
				return strings.Compare(sorted[i].ID, sorted[j].ID) < 0
			}
			return leftEmail < rightEmail
		}
		return left < right
	})

	m.users = sorted
	items := make([]list.Item, len(sorted))
	for i, user := range sorted {
		items[i] = userItem{user: user}
	}

	m.list.SetItems(items)

	if len(items) == 0 {
		m.list.ResetSelected()
		return
	}

	if selectedID != "" {
		for i, user := range m.users {
			if user.ID == selectedID {
				m.list.Select(i)
				return
			}
		}
	}

	m.list.Select(0)
}

func (m *model) appendUser(user api.User) {
	combined := append(m.users, user)
	m.setUsers(combined)
	m.selectUserByID(user.ID)
}

func (m *model) removeUser(id string) {
	filtered := make([]api.User, 0, len(m.users))
	for _, u := range m.users {
		if u.ID != id {
			filtered = append(filtered, u)
		}
	}
	m.setUsers(filtered)
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.list.SetSize(max(20, m.width-4), max(10, m.height-10))
		return m, nil

	case spinner.TickMsg:
		if m.loading {
			var cmd tea.Cmd
			m.spinner, cmd = m.spinner.Update(msg)
			return m, cmd
		}
		return m, nil

	case errMsg:
		m.err = msg.err
		m.loading = false
		return m, nil

	case usersLoadedMsg:
		m.err = nil
		m.loading = false
		m.setUsers(msg.users)
		status := fmt.Sprintf("Loaded %d users", len(msg.users))
		return m, func() tea.Msg { return statusMsg(status) }

	case userCreatedMsg:
		m.err = nil
		m.loading = false
		m.mode = modeList
		m.appendUser(msg.user)
		for i := range m.inputs {
			m.inputs[i].SetValue("")
		}
		m.inputs[0].Focus()
		m.focusIndex = 0
		status := fmt.Sprintf("Created user %s", safeDisplayName(msg.user))
		return m, func() tea.Msg { return statusMsg(status) }

	case userDeletedMsg:
		m.err = nil
		m.loading = false
		m.mode = modeList
		name := "user"
		if m.deletingUser != nil {
			name = safeDisplayName(*m.deletingUser)
			m.deletingUser = nil
		}
		m.removeUser(msg.id)
		status := fmt.Sprintf("Deleted %s", name)
		return m, func() tea.Msg { return statusMsg(status) }

	case statusMsg:
		m.status = string(msg)
		return m, nil

	case tea.KeyMsg:
		if msg.Type == tea.KeyCtrlC {
			return m, tea.Quit
		}

		switch m.mode {
		case modeList:
			return m.handleListKey(msg)
		case modeAdd:
			return m.handleAddKey(msg)
		case modeConfirmDelete:
			return m.handleConfirmKey(msg)
		}
	}

	return m, nil
}

func (m model) handleListKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "q", "esc":
		return m, tea.Quit
	case "r":
		m.loading = true
		m.status = ""
		return m, tea.Batch(spinner.Tick, fetchUsers(m.client))
	case "a":
		m.mode = modeAdd
		m.err = nil
		m.status = "Creating a new user"
		for i := range m.inputs {
			m.inputs[i].Blur()
			m.inputs[i].SetCursor(len(m.inputs[i].Value()))
		}
		m.focusIndex = 0
		m.inputs[0].Focus()
		return m, nil
	case "d":
		if selected, ok := m.list.SelectedItem().(userItem); ok {
			user := selected.user
			m.mode = modeConfirmDelete
			m.deletingUser = &user
			m.status = fmt.Sprintf("Delete %s? (y/n)", safeDisplayName(user))
			return m, nil
		}
	}

	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)
	return m, cmd
}

func (m model) handleAddKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.mode = modeList
		m.status = "Cancelled new user"
		m.err = nil
		return m, nil
	case "enter":
		if m.focusIndex >= len(m.inputs)-1 {
			return m.submitNewUser()
		}
		m.focusIndex = min(len(m.inputs)-1, m.focusIndex+1)
		m.updateInputFocus()
		return m, nil
	case "tab":
		m.focusIndex = min(len(m.inputs)-1, m.focusIndex+1)
		m.updateInputFocus()
		return m, nil
	case "shift+tab":
		m.focusIndex = max(0, m.focusIndex-1)
		m.updateInputFocus()
		return m, nil
	}

	cmds := make([]tea.Cmd, 0, len(m.inputs))
	for i := range m.inputs {
		if i == m.focusIndex {
			var cmd tea.Cmd
			m.inputs[i], cmd = m.inputs[i].Update(msg)
			cmds = append(cmds, cmd)
		}
	}
	return m, tea.Batch(cmds...)
}

func (m model) submitNewUser() (tea.Model, tea.Cmd) {
	name := strings.TrimSpace(m.inputs[0].Value())
	email := strings.TrimSpace(m.inputs[1].Value())
	role := strings.TrimSpace(m.inputs[2].Value())

	if name == "" || email == "" {
		m.err = errors.New("name and email are required")
		return m, nil
	}

	payload := api.CreateUserRequest{
		Name:  name,
		Email: email,
	}
	if role != "" {
		payload.Role = role
	} else {
		payload.Role = "User"
	}

	m.loading = true
	m.err = nil
	m.status = ""
	return m, tea.Batch(spinner.Tick, createUser(m.client, payload))
}

func (m model) handleConfirmKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "enter":
		if m.deletingUser != nil {
			m.loading = true
			m.status = ""
			return m, tea.Batch(spinner.Tick, deleteUser(m.client, m.deletingUser.ID))
		}
	case "n", "esc":
		m.mode = modeList
		m.deletingUser = nil
		m.status = "Cancelled deletion"
		return m, nil
	}
	return m, nil
}

func (m *model) updateInputFocus() {
	for i := range m.inputs {
		if i == m.focusIndex {
			m.inputs[i].Focus()
		} else {
			m.inputs[i].Blur()
		}
	}
}

func (m *model) selectedUserID() string {
	if item, ok := m.list.SelectedItem().(userItem); ok {
		return item.user.ID
	}
	return ""
}

func (m *model) selectUserByID(id string) {
	for i, user := range m.users {
		if user.ID == id {
			m.list.Select(i)
			return
		}
	}
}

func (m model) View() string {
	header := titleStyle.Render("Tessaro Admin TUI")
	var body string

	switch m.mode {
	case modeList:
		body = m.list.View()
	case modeAdd:
		body = m.addUserView()
	case modeConfirmDelete:
		body = m.confirmDeleteView()
	}

	var status string
	if m.loading {
		status = fmt.Sprintf("%s %s", m.spinner.View(), "Working...")
	} else if m.err != nil {
		status = errorStyle.Render(m.err.Error())
	} else if m.status != "" {
		status = statusStyle.Render(m.status)
	} else {
		status = helpStyle.Render("Press q to quit")
	}

	return lipgloss.JoinVertical(lipgloss.Left,
		header,
		body,
		status,
		helpStyle.Render(m.helpText()),
	)
}

func (m model) addUserView() string {
	lines := []string{
		sectionTitleStyle.Render("Create a new user"),
		"",
	}

	labels := []string{"Name", "Email", "Role"}
	for i, input := range m.inputs {
		line := lipgloss.JoinHorizontal(lipgloss.Left,
			labelStyle.Render(labels[i]+":"),
			" ",
			input.View(),
		)
		lines = append(lines, line)
		lines = append(lines, "")
	}

	lines = append(lines, helpStyle.Render("Enter to submit, Esc to cancel"))
	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}

func (m model) confirmDeleteView() string {
	if m.deletingUser == nil {
		return "No user selected"
	}
	name := safeDisplayName(*m.deletingUser)
	info := fmt.Sprintf("Delete %s? This action cannot be undone.", name)
	return lipgloss.JoinVertical(lipgloss.Left,
		sectionTitleStyle.Render("Confirm deletion"),
		"",
		infoStyle.Render(info),
		"",
		helpStyle.Render("Press y to delete or n to cancel"),
	)
}

func (m model) helpText() string {
	switch m.mode {
	case modeList:
		return "↑/↓ navigate • a add • d delete • r refresh"
	case modeAdd:
		return "tab to move • enter submit • esc cancel"
	case modeConfirmDelete:
		return "y confirm • n cancel"
	default:
		return ""
	}
}

func safeDisplayName(user api.User) string {
	name := strings.TrimSpace(user.Name)
	if name != "" {
		return name
	}
	if email := strings.TrimSpace(user.Email); email != "" {
		return email
	}
	return "user"
}

var (
	titleStyle        = lipgloss.NewStyle().Foreground(lipgloss.Color("63")).Bold(true)
	sectionTitleStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("212")).Bold(true)
	labelStyle        = lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Bold(true)
	statusStyle       = lipgloss.NewStyle().Foreground(lipgloss.Color("79"))
	errorStyle        = lipgloss.NewStyle().Foreground(lipgloss.Color("9")).Bold(true)
	helpStyle         = lipgloss.NewStyle().Foreground(lipgloss.Color("245"))
	infoStyle         = lipgloss.NewStyle().Foreground(lipgloss.Color("252"))
)

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	model := initialModel()

	p := tea.NewProgram(model, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		log.Fatal("failed to run admin TUI", "err", err)
	}
}
