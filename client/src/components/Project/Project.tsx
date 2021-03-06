import React, { useState } from 'react'
import { connect } from 'react-redux'
import {
  WithStyles,
  withStyles,
  Theme,
  createStyles,
  Tooltip,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  TableBody
} from '@material-ui/core'
import { TState } from '../../types/state'
import { selectMemberA, setProjectA } from '../../store/actions/project'
import { CreateColumn } from './CreateColumn'
import {
  Add,
  FilterList,
  Settings,
  Equalizer,
  Create
} from '@material-ui/icons'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import { NoMatch } from '../NoMatch/NoMatch'
import Helmet from 'react-helmet'
import { ProjectSettings } from './ProjectSettings'
import {
  EditProjectMutation,
  EditProjectMutationVariables,
  DragTaskMutation,
  DragTaskMutationVariables,
  DeleteListMutation,
  DeleteListMutationVariables,
  EditListMutationVariables,
  EditListMutation
} from '../../graphql/types'
import { openSnackbarA } from '../../store/actions/snackbar'
import { GQL_EDIT_PROJECT } from '../../graphql/mutations/project'
import { id } from '../../utils/utilities'
import { ProjectCell } from './Cell/ProjectCell'
import { cloneDeep } from 'apollo-utilities'
import { GQL_DRAG_TASK } from '../../graphql/mutations/task'
import { useMutation } from 'react-apollo'
import { CreateTask } from './Task/Create'
import { EditTaskModal } from './Task/Edit'
import { setListA } from '../../store/actions/list'
import { GQL_DELETE_LIST, GQL_EDIT_LIST } from '../../graphql/mutations/list'
import SpeedDial from '@material-ui/lab/SpeedDial'
import SpeedDialAction from '@material-ui/lab/SpeedDialAction'
import { FilterTasks } from './FilterTasks'
import { setFilterA } from '../../store/actions/filter'
import { ProjStats } from './Statistics'

/**
 * @todo add a filter menu with color, column, due date, label
 */

type OwnProps = {
  params: {
    id: string
  }
}

export const input: any = {
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  minWidth: '20%',
  fontSize: 18,
  outline: 'none',
  backgroundColor: '#f5f5f5',
  borderRadius: 4,
  width: 'auto',
  padding: 8,
  border: '1px solid transparent',
  '&:hover': {
    backgroundColor: 'white'
  },
  '&:focus': {
    borderColor: '#27b6ba'
  }
}

const styles = (theme: Theme) =>
  createStyles({
    fab: {
      position: 'fixed',
      bottom: theme.spacing(2),
      right: theme.spacing(2)
    },
    tooltip: {
      fontSize: 18
    },
    appbar: {},
    input: input
  })

type TProps = ReturnType<typeof mapState> &
  typeof actionCreators &
  OwnProps &
  WithStyles<typeof styles>

export const getMobile = (window: Window) => {
  return window.innerWidth <= 1000
}

export type TFilterData = {
  dueDate: 'all' | 'none' | 'today' | 'tomorrow' | [Date | null, Date | null]
  color: string[]
  points?: [number, number]
}

const CProject = (props: TProps) => {
  const [editingTaskId, setEditingTaskId] = useState('')
  const [settings, setSettings] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(getMobile(window))
  const [collapsedLists, setCollapsedLists] = useState([] as string[])
  const [editingList, setEditingList] = useState(['', ''])
  const [stats, setStats] = useState(false)

  if (isMobile) {
  }

  const [name, setName] = useState(
    props.project ? props.project.name : undefined
  )

  const [filtering, setFiltering] = useState(false)
  const [creating, setCreating] = useState('')
  const [fab, setFab] = useState(false)

  const [deleteListExec] = useMutation<
    DeleteListMutation,
    DeleteListMutationVariables
  >(GQL_DELETE_LIST, {})

  const [dragTaskExec] = useMutation<
    DragTaskMutation,
    DragTaskMutationVariables
  >(GQL_DRAG_TASK, {})

  const draggo = (vars: DragTaskMutationVariables) => {
    dragTaskExec({ variables: vars })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return
    }
    if (
      result.source.droppableId === result.destination.droppableId &&
      result.source.index === result.destination.index
    ) {
      return
    }

    const [[fromListId], [toListId, toProgress]] = [
      result.source.droppableId.split('DIVIDER'),
      result.destination.droppableId.split('DIVIDER')
    ]

    const editProject = cloneDeep(props.project)

    const fromList = editProject.lists[id(editProject.lists, fromListId)]

    const toList = editProject.lists[id(editProject.lists, toListId)]

    // react-beautiful-dnd will not give accurate index, because each droppable has only the tasks with the same progress/column
    let actualIndex =
      result.destination.index +
      props.project.tasks.reduce((accum, task) => {
        if (
          task.progress < parseInt(toProgress, 10) &&
          toList.taskIds.includes(task.id)
        ) {
          return accum + 1
        }
        return accum
      }, 0)

    if (
      fromList.id === toList.id &&
      props.project.tasks[id(props.project.tasks, result.draggableId)]
        .progress !== parseInt(toProgress, 10)
    ) {
      const addingLater =
        actualIndex >
        fromList.taskIds.findIndex((taskId) => taskId === result.draggableId)

      if (addingLater) {
        actualIndex -= 1
      }
    }

    if (actualIndex < 0) {
      actualIndex = 0
    }

    // remove old taskId instance
    fromList.taskIds = fromList.taskIds.filter(
      (taskId) => taskId !== result.draggableId
    )

    // add new taskId instance
    toList.taskIds.splice(actualIndex, 0, result.draggableId)

    // change tasks column
    editProject.tasks[
      id(editProject.tasks, result.draggableId)
    ].progress = parseInt(toProgress, 10)

    // mutate store to save changes
    props.setProject({ id: props.project.id, newProj: editProject })

    draggo({
      id: result.draggableId,
      newIndex: actualIndex,
      oldListId: fromListId,
      newListId: toListId,
      newProgress: parseInt(toProgress),
      projectId: props.project.id
    })

    return
  }

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  React.useEffect(() => {
    window.addEventListener('resize', () => {
      setIsMobile(getMobile(window))
      setWindowWidth(window.innerWidth)
    })

    return () =>
      window.removeEventListener('resize', () => {
        setIsMobile(getMobile(window))
        setWindowWidth(window.innerWidth)
      })
  }, [])

  const [editProjectExec] = useMutation<
    EditProjectMutation,
    EditProjectMutationVariables
  >(GQL_EDIT_PROJECT, {})

  const [editListExec] = useMutation<
    EditListMutation,
    EditListMutationVariables
  >(GQL_EDIT_LIST, {
    onCompleted: () => {
      props.setList({
        id: editingList[0],
        projectId: props.project.id,
        newList: { name: editingList[1] }
      })
      setEditingList(['', ''])
    }
  })

  const { classes, project } = props
  if (project) {
    return (
      <div>
        <Helmet>
          <style type="text/css">{` body { background-color: #1d364c; }`}</style>
        </Helmet>
        <AppBar color="default" className={classes.appbar} position="static">
          <Toolbar>
            <input
              style={{ width: `${windowWidth - 300}px` }}
              className={classes.input}
              value={name}
              onBlur={() =>
                editProjectExec({
                  variables: {
                    newProj: { name: name || 'newname' },
                    id: project.id
                  }
                })
              }
              onChange={(e: any) => setName(e.target.value)}
            />
            <div style={{ marginLeft: 'auto' }}>
              <IconButton onClick={() => setFiltering(true)}>
                <FilterList />
              </IconButton>
              <IconButton
                onClick={() => setSettings(true)}
                style={{ marginLeft: 8 }}
              >
                <Settings />
              </IconButton>
              <IconButton
                onClick={() => setStats(true)}
                style={{ marginLeft: 8 }}
              >
                <Equalizer />
              </IconButton>
            </div>
          </Toolbar>
        </AppBar>
        <Paper
          style={{
            margin: 20,
            padding: 20,
            paddingBottom: 80,
            minHeight: 'calc(100vh - 328px)'
          }}
        >
          <DragDropContext onDragEnd={onDragEnd}>
            <table
              style={{
                tableLayout: 'fixed',
                width: '100%',
                borderCollapse: 'separate'
              }}
            >
              <TableBody>
                <tr style={{ display: 'flex' }}>
                  {[0, 1, 2].map((col) => (
                    <td
                      key={col}
                      style={{
                        width: '100%',
                        backgroundColor: '#f2f2f2',
                        borderLeft: col ? 'none' : '1px solid #aebacc',
                        borderRight: '1px solid #aebacc',
                        borderTop: '1px solid #aebacc',
                        textAlign: 'center',
                        padding: 8,
                        fontSize: 20
                      }}
                    >
                      {col === 0
                        ? 'No Progress'
                        : col === 1
                        ? 'In Progress'
                        : 'Complete'}
                    </td>
                  ))}
                </tr>
                {project.lists.map((list) => (
                  <tr
                    style={{
                      verticalAlign: 'top',
                      display: 'flex'
                    }}
                    key={list.id}
                  >
                    {[0, 1, 2].map((progress, i) => (
                      <ProjectCell
                        filter={props.filterData}
                        confirmEditingList={() =>
                          editListExec({
                            variables: {
                              id: list.id,
                              projectId: project.id,
                              newList: { name: editingList[1] }
                            }
                          })
                        }
                        setEditingList={(id) => setEditingList(id)}
                        editingName={
                          progress === 0
                            ? list.id === editingList[0]
                              ? editingList[1]
                              : ''
                            : ''
                        }
                        setCreating={(id) => setCreating(id)}
                        deleteList={(listId) => {
                          props.setList({
                            id: listId,
                            projectId: props.project.id,
                            newList: null
                          })
                          deleteListExec({
                            variables: {
                              projectId: props.project.id,
                              id: list.id
                            }
                          })
                        }}
                        collapseList={(listId) => {
                          if (collapsedLists.includes(listId)) {
                            setCollapsedLists(
                              collapsedLists.filter((lId) => listId !== lId)
                            )
                          } else {
                            setCollapsedLists([...collapsedLists, listId])
                          }
                        }}
                        collapsedLists={collapsedLists}
                        openFunc={(tId: string) => setEditingTaskId(tId)}
                        key={i}
                        progress={progress}
                        list={list}
                        project={project}
                      />
                    ))}
                  </tr>
                ))}
              </TableBody>
            </table>
          </DragDropContext>
          {creating && (
            <CreateTask
              onClose={() => setCreating('')}
              project={props.project}
              listId={props.project.lists[0].id}
              columnId={creating}
            />
          )}
          {dialogOpen && (
            <CreateColumn
              onClose={() => setDialogOpen(false)}
              project={project}
            />
          )}
        </Paper>

        <Tooltip
          placement="left"
          classes={{ tooltip: classes.tooltip }}
          title="Add List"
        >
          <SpeedDial
            open={fab}
            ariaLabel="create list/create task"
            onClick={() => setDialogOpen(true)}
            onClose={() => setFab(false)}
            onOpen={() => setFab(true)}
            color="primary"
            className={classes.fab}
            direction="up"
            icon={<Add />}
          >
            <SpeedDialAction
              icon={<Create />}
              tooltipTitle="Create Task"
              onClick={(e) => {
                e.stopPropagation()
                setCreating(project.lists[0].id)
              }}
            />
          </SpeedDial>
        </Tooltip>
        {settings && (
          <ProjectSettings
            project={props.project}
            onClose={() => setSettings(false)}
          />
        )}
        {editingTaskId && (
          <EditTaskModal
            taskId={editingTaskId}
            onClose={() => setEditingTaskId('')}
            projectId={props.project.id}
          />
        )}
        <FilterTasks
          open={filtering}
          filterData={props.filterData}
          changeFilter={(newFilter) => props.setFilter(newFilter)}
          handleClose={() => setFiltering(false)}
        />
        <ProjStats
          projectId={project.id}
          open={stats}
          handleClose={() => setStats(false)}
        />
      </div>
    )
  }
  return <NoMatch />
}

const mapState = (state: TState, ownProps: OwnProps) => {
  return {
    project: state.projects[id(state.projects, ownProps.params.id)],
    filterData: state.filter
  }
}

const actionCreators = {
  setProject: setProjectA,
  selectMember: selectMemberA,
  openSnackbar: openSnackbarA,
  setList: setListA,
  setFilter: setFilterA
}

export const Project = withStyles(styles)(
  connect(mapState, actionCreators)(CProject)
)
