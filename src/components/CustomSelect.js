/**
 * 自定义下拉框组件
 * 用于替换原生的select元素，提供更好的样式控制和用户体验
 */
export class CustomSelect {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container
    this.options = {
      placeholder: options.placeholder || 'Select an option',
      searchable: options.searchable || false,
      clearable: options.clearable || false,
      disabled: options.disabled || false,
      maxHeight: options.maxHeight || '200px',
      ...options
    }
    
    this.isOpen = false
    this.selectedValue = null
    this.selectedText = null
    this.items = []
    this.filteredItems = []
    this.focusedIndex = -1
    this.changeCallbacks = []
    
    this.init()
  }

  init() {
    this.createStructure()
    this.bindEvents()
    
    // 如果有初始数据，设置选项
    if (this.options.items) {
      this.setItems(this.options.items)
    }
    
    // 设置初始值
    if (this.options.value) {
      this.setValue(this.options.value)
    }
  }

  createStructure() {
    this.container.innerHTML = ''
    this.container.className = 'custom-select-wrapper'
    
    // 主容器
    this.selectContainer = document.createElement('div')
    this.selectContainer.className = 'custom-select-container'
    this.selectContainer.setAttribute('tabindex', '0')
    this.selectContainer.setAttribute('role', 'combobox')
    this.selectContainer.setAttribute('aria-expanded', 'false')
    
    // 选中值显示区域
    this.selectedDisplay = document.createElement('div')
    this.selectedDisplay.className = 'custom-select-display'
    
    this.selectedText = document.createElement('span')
    this.selectedText.className = 'custom-select-text'
    this.selectedText.textContent = this.options.placeholder
    
    this.arrow = document.createElement('span')
    this.arrow.className = 'custom-select-arrow'
    this.arrow.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5z"/>
      </svg>
    `
    
    this.selectedDisplay.appendChild(this.selectedText)
    this.selectedDisplay.appendChild(this.arrow)
    this.selectContainer.appendChild(this.selectedDisplay)
    
    // 下拉选项容器
    this.dropdown = document.createElement('div')
    this.dropdown.className = 'custom-select-dropdown'
    this.dropdown.setAttribute('role', 'listbox')
    
    // 搜索框（如果启用）
    if (this.options.searchable) {
      this.searchInput = document.createElement('input')
      this.searchInput.type = 'text'
      this.searchInput.className = 'custom-select-search'
      this.searchInput.placeholder = 'Search...'
      this.dropdown.appendChild(this.searchInput)
    }
    
    // 选项列表
    this.optionsList = document.createElement('div')
    this.optionsList.className = 'custom-select-options'
    this.dropdown.appendChild(this.optionsList)
    
    this.selectContainer.appendChild(this.dropdown)
    this.container.appendChild(this.selectContainer)
    
    // 设置禁用状态
    if (this.options.disabled) {
      this.setDisabled(true)
    }
  }

  bindEvents() {
    // 点击选择器切换下拉状态
    this.selectedDisplay.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!this.options.disabled) {
        this.toggle()
      }
    })
    
    // 键盘导航
    this.selectContainer.addEventListener('keydown', (e) => {
      if (this.options.disabled) return
      
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (this.isOpen) {
            if (this.focusedIndex >= 0) {
              this.selectItem(this.filteredItems[this.focusedIndex])
            }
          } else {
            this.open()
          }
          break
        case 'Escape':
          e.preventDefault()
          this.close()
          break
        case 'ArrowDown':
          e.preventDefault()
          if (!this.isOpen) {
            this.open()
          } else {
            this.focusNext()
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (this.isOpen) {
            this.focusPrevious()
          }
          break
      }
    })
    
    // 搜索功能
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.filterItems(e.target.value)
      })
      
      this.searchInput.addEventListener('keydown', (e) => {
        e.stopPropagation()
      })
    }
    
    // 点击外部关闭下拉
    document.addEventListener('click', (e) => {
      if (!this.selectContainer.contains(e.target)) {
        this.close()
      }
    })
  }

  setItems(items) {
    this.items = items.map(item => {
      if (typeof item === 'string') {
        return { value: item, text: item }
      }
      return item
    })
    this.filteredItems = [...this.items]
    this.renderOptions()
    
    // 如果当前选中的值在新的选项中，更新显示文本
    if (this.selectedValue) {
      const selectedItem = this.items.find(item => item.value === this.selectedValue)
      if (selectedItem) {
        this.selectedText.textContent = selectedItem.text
      }
    }
  }

  renderOptions() {
    this.optionsList.innerHTML = ''
    
    if (this.filteredItems.length === 0) {
      const noResults = document.createElement('div')
      noResults.className = 'custom-select-no-results'
      noResults.textContent = 'No results found'
      this.optionsList.appendChild(noResults)
      return
    }
    
    this.filteredItems.forEach((item, index) => {
      const option = document.createElement('div')
      option.className = 'custom-select-option'
      option.setAttribute('role', 'option')
      option.setAttribute('data-value', item.value)
      option.textContent = item.text
      
      if (item.value === this.selectedValue) {
        option.classList.add('selected')
        option.setAttribute('aria-selected', 'true')
      }
      
      option.addEventListener('click', () => {
        this.selectItem(item)
      })
      
      option.addEventListener('mouseenter', () => {
        this.setFocusedIndex(index)
      })
      
      this.optionsList.appendChild(option)
    })
  }

  filterItems(searchTerm) {
    if (!searchTerm) {
      this.filteredItems = [...this.items]
    } else {
      this.filteredItems = this.items.filter(item =>
        item.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    this.focusedIndex = -1
    this.renderOptions()
  }

  selectItem(item) {
    this.selectedValue = item.value
    this.selectedText.textContent = item.text
    this.selectedText.classList.remove('placeholder')
    
    // 更新选中状态
    this.optionsList.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.remove('selected')
      opt.setAttribute('aria-selected', 'false')
    })
    
    const selectedOption = this.optionsList.querySelector(`[data-value="${item.value}"]`)
    if (selectedOption) {
      selectedOption.classList.add('selected')
      selectedOption.setAttribute('aria-selected', 'true')
    }
    
    this.close()
    this.triggerChange(item.value, item.text)
  }

  setValue(value) {
    const item = this.items.find(item => item.value === value)
    if (item) {
      this.selectItem(item)
    }
  }

  getValue() {
    return this.selectedValue
  }

  getText() {
    return this.selectedValue ? this.selectedText.textContent : null
  }

  open() {
    if (this.options.disabled || this.isOpen) return
    
    this.isOpen = true
    this.selectContainer.classList.add('open')
    this.selectContainer.setAttribute('aria-expanded', 'true')
    this.dropdown.style.maxHeight = this.options.maxHeight
    
    if (this.searchInput) {
      this.searchInput.focus()
      this.searchInput.value = ''
      this.filterItems('')
    }
    
    // 滚动到选中项
    const selectedOption = this.optionsList.querySelector('.selected')
    if (selectedOption) {
      selectedOption.scrollIntoView({ block: 'nearest' })
    }
  }

  close() {
    if (!this.isOpen) return
    
    this.isOpen = false
    this.selectContainer.classList.remove('open')
    this.selectContainer.setAttribute('aria-expanded', 'false')
    this.dropdown.style.maxHeight = '0'
    this.focusedIndex = -1
    
    // 清除焦点样式
    this.optionsList.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.remove('focused')
    })
    
    // 让选择器失焦
    this.selectContainer.blur()
  }

  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  focusNext() {
    if (this.filteredItems.length === 0) return
    
    this.focusedIndex = Math.min(this.focusedIndex + 1, this.filteredItems.length - 1)
    this.updateFocusedOption()
  }

  focusPrevious() {
    if (this.filteredItems.length === 0) return
    
    this.focusedIndex = Math.max(this.focusedIndex - 1, 0)
    this.updateFocusedOption()
  }

  setFocusedIndex(index) {
    this.focusedIndex = index
    this.updateFocusedOption()
  }

  updateFocusedOption() {
    this.optionsList.querySelectorAll('.custom-select-option').forEach((opt, index) => {
      opt.classList.toggle('focused', index === this.focusedIndex)
    })
    
    // 滚动到焦点项
    const focusedOption = this.optionsList.children[this.focusedIndex]
    if (focusedOption) {
      focusedOption.scrollIntoView({ block: 'nearest' })
    }
  }

  setDisabled(disabled) {
    this.options.disabled = disabled
    this.selectContainer.classList.toggle('disabled', disabled)
    
    if (disabled) {
      this.selectContainer.setAttribute('tabindex', '-1')
      this.close()
    } else {
      this.selectContainer.setAttribute('tabindex', '0')
    }
  }

  onChange(callback) {
    this.changeCallbacks.push(callback)
  }

  triggerChange(value, text) {
    this.changeCallbacks.forEach(callback => {
      callback(value, text)
    })
  }

  destroy() {
    this.container.innerHTML = ''
    this.changeCallbacks = []
  }
}